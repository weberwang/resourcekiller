var BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
var BASE64_VALUES = new Array(123); // max char code in base64Keys
for (let i = 0; i < 123; ++i) BASE64_VALUES[i] = 64; // fill with placeholder('=') index
for (let i = 0; i < 64; ++i) BASE64_VALUES[BASE64_KEYS.charCodeAt(i)] = i;
var HexChars = '0123456789abcdef'.split('');
var _t = ['', '', '', ''];
var UuidTemplate = _t.concat(_t, '-', _t, '-', _t, '-', _t, '-', _t, _t, _t);
var Indices = UuidTemplate.map(function (x, i) {
    return x === '-' ? NaN : i;
}).filter(isFinite);
export default decodeUuid = (base64str) => {
    // fcmR3XADNLgJ1ByKhqcC5Z -> fc991dd7-0033-4b80-9d41-c8a86a702e59
    let base64 = base64str.split("");
    Editor.log("base64=====>", base64.length)
    if (base64.length !== 22) {
        return base64;
    }
    UuidTemplate[0] = base64[0];
    UuidTemplate[1] = base64[1];
    for (var i = 2, j = 2; i < 22; i += 2) {
        var lhs = Base64Values[base64.charCodeAt(i)];
        var rhs = Base64Values[base64.charCodeAt(i + 1)];
        UuidTemplate[Indices[j++]] = HexChars[lhs >> 2];
        UuidTemplate[Indices[j++]] = HexChars[((lhs & 3) << 2) | rhs >> 4];
        UuidTemplate[Indices[j++]] = HexChars[rhs & 0xF];
    }
    return UuidTemplate.join('');
}