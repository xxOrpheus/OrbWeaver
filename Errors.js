const Error = {};
const Errors = [
	"INVALID_USERNAME",
	"INVALID_PASSWORD",
	"INVALID_LOGIN",
	"INVALID_WORLD",
	"INVALID_GROUP",
	"ALREADY_LOGGED_IN",
	"ALREADY_IN_GROUP",
	"INVALID_PROP_TYPE"
];

Errors.forEach((error, errorCode) => {
	Error[error] = errorCode;
});

module.exports = {Errors, Error};