export const Error = {};
export const Errors = [
	"INVALID_USERNAME",
	"INVALID_PASSWORD",
	"INVALID_LOGIN",
	"INVALID_WORLD",
	"INVALID_GROUP",
	"ALREADY_LOGGED_IN",
	"ALREADY_IN_GROUP",
	"INVALID_MODEL_TYPE",
	"INVALID_UPDATE",
	"INVALID_USER_ID",
	"NO_CONNECTION_AVAILABLE",
	"SERVER_FULL"
];

Errors.forEach((error, errorCode) => {
	console.log(error, errorCode);
	Error[error] = errorCode;
});