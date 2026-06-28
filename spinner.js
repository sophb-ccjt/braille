const spinnerBrailleFile = `fc abcdefgh1
ec 0
of chain_strings

p h0
c 00000000
c 00000000
c 00000000
c 00000000
c 00000000
c 00000000
c 00000000
c 00000000
pe

p h1
c 10000000
c 00100000
c 00001000
c 00000010
c 00000001
c 00000100
c 00010000
c 00100000
pe

p h2
c a0b00000
c 00a0b000
c 0000a0b0
c 000000ab
c 00000b0a
c 000b0a00
c 0b0a0000
c ba000000
pe

p h3
c a0b0c000
c 00a0b0c0
c 0000a0bc
c 00000cab
c 000c0b0a
c 0c0b0a00
c cb0a0000
c bac00000
pe

p h4
c a0b0c0d0
c 00a0b0cd
c 0000adbc
c 000d0cab
c 0d0c0b0a
c dc0b0a00
c cbda0000
c 0bcad000
c bac0d000
pe

p h5
c a0b0c0de
c 00a0becd
c 000eadbc
c 0e0d0cab
c ed0c0b0a
c dceb0a00
c cbdae000
c bac0d0e0
pe

p h6
c a0b0cfde
c 00afbecd
c 0f0eadbc
c fe000cab
c e0fc0b0a
c dcebfa00
c cbdae0f0
c bac0d0ef
pe

p h7
c a0bgcfde
c 0gafbecd
c gf0eadbc
c fegd0cab
c efdgc0ba
c dcebfag0
c cbdae0fg
c bac0dgef
pe

p h8
c ahbgcfde
c hgafbecd
c gfheadbc
c fegdhcab
c efdgchba
c dcebfagh
c cbdaehfg
c bachdgef
pe

p l0
c 000000
c 000000
c 000000
c 000000
c 000000
c 000000
pe

p l0
c 000000
c 000000
c 000000
c 000000
c 000000
c 000000
pe

p l1
c a00000
c 00a000
c 0000a0
c 00000a
c 000a00
c 0a0000
pe

p l2
c a0b000
c 00a0b0
c 0000ab
c 000b0a
c 0b0a00
c ba0000
pe

p l3
c a0b0c0
c 00a0bc
c 000cab
c 0c0b0a
c cb0a00
c bac000
pe

p l4
c a0b0cd
c 00adbc
c 0d0cab
c dc0b0a
c cbda00
c bac0d0
pe

p l5
c a0becd
c 0eadbc
c ed0cab
c dceb0a
c cbdae0
c bac0de
pe

p l6
c afbecd
c feadbc
c edfcab
c dcebfa
c cbdaef
c bacfde
pe
`;

function getBrailleSpinnerFrames(size = 3, highres = false) {
    const compiledBraille = compileFile(spinnerBrailleFile);
    const frames = compiledBraille.patterns[['l', 'h'][highres+0] + size];
    return frames;
}
