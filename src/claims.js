export function checkClaims(claims, requiredClaims) {
  if (!requiredClaims) {
    return true;
  }
  if (!claims) {
    return false;
  }
  for (const key in requiredClaims) {
    const parts = key.split(".");
    let obj = claims;
    for (let i=0; i < parts.length; i++) {
      const part = parts[i];
      let newObj = obj[part];
      if (!newObj) {
        return false;
      }
      if (i === parts.length - 1) {
        return newObj === requiredClaims[key];
      }
      obj = newObj;
    }
  }
  return false;
}
