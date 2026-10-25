export function binary64Values(value) {
  const result = {};
  const visit = (value, path) => {
    if (typeof value === "number") {
      if (!Number.isFinite(value))
        throw new Error("Observed producer returned a nonfinite number");
      const bytes = Buffer.alloc(8);
      bytes.writeDoubleBE(value);
      result[path] = bytes.toString("hex");
    } else if (Array.isArray(value))
      value.forEach((child, index) => visit(child, `${path}/${index}`));
    else if (value && typeof value === "object")
      for (const key of Object.keys(value).sort())
        visit(
          value[key],
          `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`,
        );
  };
  visit(value, "");
  return result;
}
export function validateBinary64(value, identities) {
  const actual = binary64Values(value);
  if (
    JSON.stringify(Object.keys(actual).sort()) !==
    JSON.stringify(Object.keys(identities).sort())
  )
    throw new Error("Numeric binary64 leaf membership differs");
  for (const [pointer, hex] of Object.entries(identities)) {
    if (!/^[0-9a-f]{16}$/.test(hex))
      throw new Error("Invalid numeric binary64 bytes");
    const number = Buffer.from(hex, "hex").readDoubleBE();
    const expected = Buffer.from(actual[pointer], "hex").readDoubleBE();
    if (!Number.isFinite(number) || number !== expected)
      throw new Error(
        "Numeric sample values disagree with declared binary64 bytes",
      );
  }
}
