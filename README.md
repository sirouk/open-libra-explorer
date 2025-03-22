This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Configuration

This explorer supports both client-side and server-side API calls to the blockchain. You can configure this behavior in the `config.ts` file:

```typescript
// When true, API calls will be made directly from the browser
// When false, API calls will be made server-side using server actions
export const CLIENT_SIDE_API = false;
```

Setting `CLIENT_SIDE_API` to `true` makes all blockchain queries run directly in the browser, which can be useful for development or when you want to reduce server load. Setting it to `false` uses Next.js server actions for all API calls, which can be more secure and performant for production use.

> **Note:** Client-side mode (`CLIENT_SIDE_API = true`) currently has compatibility issues with the Open Libra SDK in browser environments. It's recommended to keep this setting as `false` unless you've resolved these compatibility issues. Error messages like `ReferenceError: module is not defined` indicate browser compatibility problems with the SDK.

## Production Deployment

### Building Without Type Checking

For production deployment, you can build the application without TypeScript or ESLint checks using:

```bash
npm run build-no-lint
```

This is useful when you need to deploy quickly or when there are TypeScript errors that don't affect runtime functionality.

### Running in Production

To run the application on port 3000 for production use:

```bash
npm run start-prod
```

Or to build and run in a single command:

```bash
npm run build-no-lint && npm run start-prod
```

### Nginx Configuration

The application is designed to work with Nginx as a reverse proxy. Add this to your Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com; # or localhost for local testing

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Test and restart Nginx after adding this configuration:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
