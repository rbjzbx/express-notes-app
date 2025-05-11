export function loginSuccessful() {
  return {
    type: 'RECEIVE_LOGIN_SUCCESSFUL',
  };
}

export function login() {
  return dispatch => {
    setTimeout(() => {
      dispatch(loginSuccessful());
    }, 1000);
  };
}

export function setRedirectUrl(url) {
  return {
    type: 'SET_REDIRECT_URL',
    url,
  }
}