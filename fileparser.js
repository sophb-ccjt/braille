class LeveledConsole {
    #levelNames = {};
    shouldLog(messageLevel) {
        if (this.loggingLevel < 0)
            return messageLevel === this.loggingLevel;
        else 
            return this.loggingLevel >= messageLevel;
    }

    constructor (loggingLevel) {
        if (typeof loggingLevel !== 'number')
            throw new TypeError('Logging level must be a number.');

        this.loggingLevel = loggingLevel;
        
        const consoleFunctions = Object.entries(console).filter(v => typeof v[1] === 'function');
        for (const [functionName, consoleFunction] of consoleFunctions) {
            this[functionName] = function (messageLevel, ...args) {
                if (this.shouldLog(messageLevel))
                    consoleFunction(...args);
                else return null;
            }
        }
    }
    levelName(loggingLevel) {
        if (typeof loggingLevel !== 'number')
            throw new TypeError('Logging level must be a number.');

        return this.#levelNames[loggingLevel];
    }
    setLevelName(loggingLevel, name) {
        if (typeof loggingLevel !== 'number')
            throw new TypeError('Logging level must be a number.');

        return this.#levelNames[loggingLevel] = name;
    }
}

const tokenRules = {
    FULL_CHAR_DEF: {
        pattern: /^[\t ]*fc[\t ]+([\S\t ]+)[\t ]*/,
        groupTokens: [
            'FULL_CHARS'
        ]
    },
    EMPTY_CHAR_DEF: {
        pattern: /^[\t ]*ec[\t ]+([\S\t ]+)[\t ]*/,
        groupTokens: [
            'EMPTY_CHARS'
        ]
    },
    OUTPUT_TYPE_DEF: {
        pattern: /^[\t ]*of[\t ]+(array|chain_string)/,
        groupTokens: [
            'OUTPUT_TYPE'
        ]
    },
    PATTERN_DEF: {
        pattern: /^[\t ]*p\s+(?:(\w+)\s+)?(.+?)\s+pe[\t ]*/m,
        groupTokens: [
            'PATTERN_NAME',
            'CELL_PATTERNS'
        ]
    },
    COMMENT: {
        pattern: /;[\t ]*(.+)$/,
        ignore: true
    },
    MULTILINE_COMMENT: {
        pattern: /:\s*(.+?)\s*:/m,
        ignore: true
    }
}
function tokenizeFile(fileContent, loggingLevel = 0) {
    // init leveled console
    const Lconsole = new LeveledConsole(loggingLevel);
    Lconsole.setLevelName(-1, 'debugging');
    Lconsole.setLevelName(0, 'none');
    Lconsole.setLevelName(1, 'vague');
    Lconsole.setLevelName(2, 'informant');
    Lconsole.setLevelName(3, 'verbose');

    // do what it says (does what it says)
    const originalFileContent = fileContent;
    Lconsole.log(3, 'Trimming code...');
    fileContent = fileContent.trim();

    // commence the tokenization
    Lconsole.log(1, 'Tokenizing...');
    Lconsole.log(2, 'Removing ignored tokens from code...');
    const ignoredTokens = Object.entries(tokenRules).filter(v => v.ignore);
    Lconsole.log(-1, 'Tokens to ignore:', Object.fromEntries(ignoredTokens));
        
    for (const [token, def] of ignoredTokens) {
        Lconsole.log(3, 'Ignoring token', token);

        let pattern = def.pattern;
        if (!pattern.flags.includes('g')) {
            Lconsole.warn(0, 'Added required "g" flag to regex pattern of ignored token', token + ', this may cause unpredictable issues.');
            Lconsole.warn(-1, 'Added required "g" flag to regex pattern of ignored token', token + ', this may cause unpredictable issues.');
            pattern = new RegExp(pattern.source, pattern.flags + 'g');
        }
        fileContent = fileContent.replaceAll(pattern, '');
    }

    // parse non-ignored tokens
    Lconsole.log(2, 'Parsing remaining tokens...');
    const tokens = [];
    while (fileContent) {
        let found = false;
        Object.entries(tokenRules).forEach(entry => {
            const [ruleName, ruleDef] = entry;
            if (ruleDef.ignore) return;

            Lconsole.log(3, 'Matching against', ruleName);
            const match = fileContent.match(ruleDef.pattern);
            Lconsole.log(-1, `Match result against ${ruleName}:`, match);
            if (!match) return; found = true;

            Lconsole.log(2, 'Parsing token rule', ruleName);
            Lconsole.log(-1, 'Token rule definition:', ruleDef);
            const groups = [...match].slice(1);
            for (const [group, value] of groups.entries()) {
                const token = {
                    name: ruleDef.groupTokens[group],
                    value,
                    index: originalFileContent.length - fileContent.length
                }
                tokens.push(token);
                Lconsole.log(-1, 'Parsed token:', token);
            }
            fileContent = fileContent.slice(match[0].length).trim();
            Lconsole.log(-1, 'Remaining file content:', fileContent);
        });
        if (!found) {
            const errorIndex = originalFileContent.length - fileContent.length;
            throw new SyntaxError(`Unexpected token "${fileContent[0]}" at index ${errorIndex}`);
        }
    }
    return tokens;
}
