try {
    require('./routes/users');
} catch (err) {
    console.log('ERROR_NAME: ' + err.name);
    console.log('ERROR_MESSAGE: ' + err.message);
}
