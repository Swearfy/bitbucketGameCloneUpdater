To run 
pnpm i
node gameCloner.js

You need API Key from bitbucket account with 
from here 
https://id.atlassian.com/manage-profile/security/api-tokens

Scopes at least: (dont know the exact ones just give full read access to bitbucket account)
Read
read:account
read:me
read:project:bitbucket
read:repository:bitbucket
read:pullrequest:bitbucket
read:pipeline:bitbucket
read:workspace:bitbucket
read:user:bitbucket

add key in .env file like this
BITBUCKET_API_KEY=your_api_key_here