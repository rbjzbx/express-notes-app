const initialState = {
  loggedIn: false,
  isLogging: false,
  redirectUrl: '',
};

export default function login(state = initialState, action) {
  switch (action.type) {
    case 'REQUEST_LOGIN':
      return {
        ...state,
        isLogging: true,
      };
    case 'RECEIVE_LOGIN_SUCCESSFUL':
      return {
        ...state,
        isLogging: false,
        loggedIn: true,
      };
    case 'SET_REDIRECT_URL':
      return {
        ...state,
        redirectUrl: action.url,
      };
    default:
      return state;
  }
}