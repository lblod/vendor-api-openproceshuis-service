export default (value?: string) => {
  if (!value) {
    return false;
  }

  const urlRegex = '^(https?://)[a-zA-Z0-9-]+(.[a-zA-Z0-9-]+)*(/.*)?$';
  return value.match(urlRegex);
};
