export default (value?: string) => {
  if (!value) {
    return false;
  }

  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(
    value,
  );
};
