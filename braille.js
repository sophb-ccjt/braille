function getBrailleCellPattern(cellbinary) {
	if (typeof cellbinary !== "number")
		throw new TypeError("Braille cell binary must be a number.");
	if (cellbinary > 255)
		throw new RangeError("Braille cell binary must be lower than 255.");
	if (cellbinary < 0)
		throw new RangeError("Braille cell binary must be greater than 0.");

	return String.fromCharCode(0x2800 + cellbinary);
}
function brailleCellCharToBinary(cell) {
	if (typeof cell !== "string")
		throw new TypeError("Braille cell string must be a string.");
	if (cell.length !== 1)
		throw new SyntaxError("Braille cell string must have a length of 1.");

	const charCode = cell.charCodeAt(0);
	if (charCode < 0x2800 || charCode > 0x28ff)
		throw new SyntaxError("Braille cell string must be of a cell.");

	return charCode - 0x2800;
}
function brailleCellStringToPattern(string) {
	const mappingString = "031425";
	const hiresMappingString = "03142567";
	const emptyDotChars = [" ", "0"];
	const fullDotChars = [".", "1"];
	const validChars = [...emptyDotChars, ...fullDotChars];
	let brailleDots = 0;

	const dotArray = [...string]
		.filter((char) => validChars.includes(char))
		.map((char) => fullDotChars.includes(char));

	console.log(dotArray);
	if (dotArray.length !== 6 && dotArray.length !== 8)
		throw new SyntaxError("Braille cell string must have 6 or 8 dots.");

	for (const [index, isFilled] of dotArray.entries()) {
		if (isFilled) brailleDots += 2 ** parseInt(mappingString[index]);
	}
	return getBrailleCellPattern(brailleDots);
}
