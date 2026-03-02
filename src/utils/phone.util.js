const normalizePhoneNumber = (input) => {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  if (String(input).startsWith("+")) {
    return String(input);
  }
  return `+${digits}`;
};

module.exports = {
  normalizePhoneNumber
};
