# Docker

`docker-compose` can be used to quickly set up all the prerequisites needed.

If you plan to use `docker-compose` change this in your `.env` file 

```
# Attic
ATTIC_URI=http://localhost:8203

# Databases 
MONGO_URI=mongodb://localhost:8201/marketplace
SESSION_REDIS_URI=redis://localhost:8202/2
SERVICE_OAUTH_REDIS_URI=redis://localhost:8202/3
```

You can then run `docker-compose up redis attic mongo`
