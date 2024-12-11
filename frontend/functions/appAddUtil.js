const lettersAndNumbers = 'kxDGe1lZvSHhXcY9BtPwmTqRigoWEp6fLy8N7zAb3aCdJ5Q42uVIFKMUOsjnr'

const crypto = require("crypto");

function generateId(length){
    const charsetLength = lettersAndNumbers.length;

    // Create a typed array to hold random values
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
     
    // Map random values to the charset
    return Array.from(randomValues, (value) => lettersAndNumbers[value % charsetLength]).join('');
}

module.exports = {generateId}