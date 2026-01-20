export default (value?: string, maxLength = 500) => {
  if (!value) {
    return false;
  }

  return typeof value === 'string' && value.length > maxLength;
};
