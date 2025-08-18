// Mock axios for testing

// Create a function that can be called
const axios = jest.fn((config) => {
  // Default success response
  return Promise.resolve({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: config || {}
  });
});

// Add HTTP method shortcuts
axios.get = jest.fn(() => Promise.resolve({ data: {}, status: 200 }));
axios.post = jest.fn(() => Promise.resolve({ data: {}, status: 200 }));
axios.put = jest.fn(() => Promise.resolve({ data: {}, status: 200 }));
axios.patch = jest.fn(() => Promise.resolve({ data: {}, status: 200 }));
axios.delete = jest.fn(() => Promise.resolve({ data: {}, status: 200 }));
axios.head = jest.fn(() => Promise.resolve({ data: {}, status: 200 }));
axios.options = jest.fn(() => Promise.resolve({ data: {}, status: 200 }));

// Add axios.create
axios.create = jest.fn(() => axios);

// Add defaults
axios.defaults = {
  headers: {
    common: {},
    get: {},
    post: {},
    put: {},
    patch: {},
    delete: {}
  }
};

// Add interceptors
axios.interceptors = {
  request: {
    use: jest.fn(),
    eject: jest.fn()
  },
  response: {
    use: jest.fn(),
    eject: jest.fn()
  }
};

module.exports = axios;