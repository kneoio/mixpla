# Mixpla Radio Player

This is a Vue 3 and Vite-powered web application for the Mixpla radio player, featuring secure authentication using Keycloak (OIDC).

## Features

- **Modern Frontend Stack**: Built with Vue 3, Vite, and Pinia for state management.
- **Dynamic UI**: The user interface is built with the Naive UI component library.
- **Secure Authentication**: Integrated with Keycloak using the `keycloak-js` library for OIDC authentication.
- **Authenticated API Requests**: Uses `axios` with an interceptor to automatically attach bearer tokens to API calls.
- **Protected Routes**: Implements `vue-router` with navigation guards to protect specific parts of the application.

## Project Setup

1.  **Clone the repository**

2.  **Install dependencies**:
    ```bash
    npm install
    ```

## Keycloak Configuration

For authentication to work, you must configure your Keycloak instance and the application correctly.

### 1. Keycloak Client Setup

In your Keycloak Admin Console, create a new client with the following settings:

-   **Client ID**: This can be any unique name (e.g., `mixpla-app`).
-   **Client Protocol**: `openid-connect`
-   **Access Type**: `public`
-   **Valid Redirect URIs**:
    -   `http://localhost:5176/*` (for local development)
    -   `https://your-production-domain.com/*` (for production)
-   **Web Origins**:
    -   `http://localhost:5176`
    -   `https://your-production-domain.com`
    -   Alternatively, you can use `+` to allow all valid redirect URIs.

### 2. Application Configuration

Update the Keycloak configuration in `src/services/keycloak.js` with the details from your Keycloak instance:

```javascript
// src/services/keycloak.js

import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'https://auth.kneo.io', // Your Keycloak server URL
  realm: 'kneo',               // Your realm name
  clientId: 'YOUR_CLIENT_ID' // The Client ID you created in Keycloak
});

export default keycloak;
```

Replace `'YOUR_CLIENT_ID'` with the actual Client ID from your Keycloak client.

## Development

To run the development server with hot-reloading, use the following command. The application will be available at `http://localhost:5176`.

```bash
npm run dev
```

## Build and Preview

1.  **Build for Production**

    This command bundles the application into the `dist/` directory.

    ```bash
    npm run build
    ```

2.  **Preview the Production Build**

    This command starts a local static server to host the files from the `dist/` directory. This is a great way to test the production build locally before deploying.

    ```bash
    npm run preview
    ```
