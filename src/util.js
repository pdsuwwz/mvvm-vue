export default {
  getValueFromData(expression, target) {
    const keys = expression.split('.')
    let result = target
    for (let i = 0; i < keys.length; i++) {
      if (!result) {
        break;
      }
      result = result[keys[i]]
    }
    return result
  }
}