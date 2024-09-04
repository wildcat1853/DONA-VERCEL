function isValidJSON(str: string) {
    try {
        JSON.parse(str);
        return true;  // If no error, the string is valid JSON
    } catch (e) {
        return false; // If an error is caught, the string is not valid JSON
    }
}
export default isValidJSON