// helpers
class LeveledConsole {
    #levelNames = {};
    shouldLog(messageLevel) {
        if (this.loggingLevel < 0)
            return messageLevel === this.loggingLevel;

        else if (this.loggingLevel === 0)
            return false;

        else return this.loggingLevel >= messageLevel;
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
function getBrailleCellPattern(cellbinary) {
    if (typeof cellbinary !== 'number')
        throw new TypeError('Braille cell binary must be a number.');
    if (cellbinary > 255)
        throw new RangeError('Braille cell binary must be lower than 255.');
    if (cellbinary < 0)
        throw new RangeError('Braille cell binary must be greater than 0.');

    return String.fromCharCode(0x2800 + cellbinary);
}
function brailleCellStringToPattern(string, emptyDotChars = [' ', '0'], fullDotChars = ['.', '1']) {
    const validChars = [...emptyDotChars, ...fullDotChars];
    const mappingString = '03142567';
    let brailleDots = 0;

    const dotArray = 
        [...string]
        .filter(char => validChars.includes(char))
        .map(char => fullDotChars.includes(char));

    if (dotArray.length !== 6 && dotArray.length !== 8)
        throw new SyntaxError('Braille cell string must have 6 or 8 dots.');

    for (const [index, isFilled] of dotArray.entries()) {
        if (isFilled) brailleDots += 2**parseInt(mappingString[index]);
    }
    return getBrailleCellPattern(brailleDots);
}

// tokens
const tokenRules = {
    FULL_CHAR_DEF: {
        pattern: /^[\t ]*fc[\t ]+([\S\t ]+)[\t ]*/,
        groupTokens: [
            'FULL_CHARS'
        ],
        required: true
    },
    EMPTY_CHAR_DEF: {
        pattern: /^[\t ]*ec[\t ]+([\S\t ]+)[\t ]*/,
        groupTokens: [
            'EMPTY_CHARS'
        ],
        required: true
    },
    OUTPUT_TYPE_DEF: {
        pattern: /^[\t ]*of[\t ]+(array|chain_strings|object)/,
        groupTokens: [
            'OUTPUT_TYPE'
        ],
        required: true
    },
    PATTERN_DEF: {
        pattern: /^[\t ]*(p)\s+(\w+)\s+([\S\s]+?)\s+(pe)[\t ]*/m,
        groupTokens: [
            'PATTERN_START',
            'PATTERN_NAME',
            'CELL_PATTERNS',
            'PATTERN_END'
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
const tokenHandlers = {
    FULL_CHARS: {
        handler: (output, {value}={}) => {
            output.fullChars = [...value];
            return output;
        }
    },
    EMPTY_CHARS: {
        handler: (output, {value}={}) => {
            output.emptyChars = [...value];
            return output;
        }
    },
    OUTPUT_TYPE: {
        handler: (output, {value}={}) => {
            output.type = value;
            return output;
        },
        fallback: 'chain_strings'
    },
    PATTERN_START: {
        handler: (output, {nextTokens, tokens}={}) => {
            if (nextTokens[2].name !== 'PATTERN_END')
                throw new SyntaxError('Pattern start is missing a matching pattern end');

            const name = nextTokens[0].value;
            const cellPatterns = nextTokens[1].value.split('\n').map(v => v.slice('c '.length));
            switch (output.type) {
                case 'object':
                    output.patterns ??= {};
                    output.patterns[name] = cellPatterns;
                    break;

                case 'array':
                    output.patterns ??= [];
                    if (!output.patterns.find(pattern => pattern[0] === cellPatterns))
                        output.patterns.push([name, cellPatterns]);
                    break;

                case 'chain_strings':
                    output.patterns = {};
                    output.patterns[name] = cellPatterns.map(cell => brailleCellStringToPattern(cell, output.emptyChars, output.fullChars));
                    break;
            }
            return output;
        }
    }
}

// tokenizer
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
                // 
                const token = {
                    name: ruleDef.groupTokens[group],
                    value,
                    index: originalFileContent.length - fileContent.length,
                    line: 0,
                    col: 0
                }
                // get token location in file
                const lines = originalFileContent.split('\n');
                const index = originalFileContent.length - fileContent.length;
                let lengthSum = 0;
                let previousLengthSum = 0;
                for (const [lineindex, content] of lines.entries()) {
                    token.line = lineindex;
                    lengthSum += content.length;
                    if (lengthSum >= index) break;
                    previousLengthSum = lengthSum;
                }
                token.line++;
                token.col = (index - (lengthSum - (lengthSum - previousLengthSum))) + 2;

                tokens.push(token);
                Lconsole.log(-1, 'Parsed token:', token);
            }
            fileContent = fileContent.slice(match[0].length).trim();
            Lconsole.log(-1, 'Remaining file content:', fileContent);
        });
        if (!found) {
            const errorIndex = originalFileContent.length - fileContent.length;
            const quote = fileContent[0] === "'" ? '"' : "'";
            throw new SyntaxError(`Invalid token ${quote + fileContent[0] + quote} at index ${errorIndex}`);
        }
    }
    const requiredTokens = Object.entries(tokenRules).filter(token => token.required);
    for (const [requiredToken] of requiredTokens) {    
        if (!tokens.includes(requiredToken)) {
            if (tokenHandlers[requiredToken].fallback) {
                tokens.unshift({
                    name: requiredToken,
                    value: tokenHandlers[requiredToken].fallback,
                    index: -1,
                    line: 0,
                    col: 0
                });
            } else throw new SyntaxError(`File is missing the required token ${requiredToken}`);
        }
    }
    return tokens;
}
// parser
function parseTokens(tokens, loggingLevel = 0) {
    // init leveled console
    const Lconsole = new LeveledConsole(loggingLevel);
    Lconsole.setLevelName(-1, 'debugging');
    Lconsole.setLevelName(0, 'none');
    Lconsole.setLevelName(1, 'vague');
    Lconsole.setLevelName(2, 'informant');
    Lconsole.setLevelName(3, 'verbose');

    // parse
    const output = {};
    Lconsole.log(1, 'Parsing tokens...');
    for (const [index, token] of tokens.entries()) {
        Lconsole.log(3, 'Parsing token', token.name);
        const handler = tokenHandlers[token.name];
        if (!handler) {
            Lconsole.log(3, `Token ${token.name} does not have a handler. Skipping token...`);
            continue;
        }
        const nextTokens = tokens.filter((_, i) => i > index),
              prevTokens = tokens.filter((_, i) => i < index);

        Lconsole.log(-1, 'Previous tokens:', prevTokens);
        Lconsole.log(-1, 'Next tokens:', nextTokens);

        handler.handler(output, {
            value: token.value,
            nextTokens,
            prevTokens,
            tokens
        });
        Lconsole.log(2, 'Parsed token', token.name);
    }
    return output;
}
// compiler(?)
function compileFile(file, loggingLevel = 0) {
    const tokens = tokenizeFile(file, loggingLevel);
    const output = parseTokens(tokens, loggingLevel);
    return output;
}
