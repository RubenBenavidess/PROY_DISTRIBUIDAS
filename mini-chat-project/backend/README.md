# Backend

# 1. Create .env in backend directory.

# 2. Generate ESM256 keys **IN authentication-microservice/src**
`
mkdir -p keys \
openssl ecparam -name prime256v1 -genkey -noout -out keys/ec_private.pem \
openssl ec -in keys/ec_private.pem -pubout -out keys/ec_public.pem \
chmod 600 keys/ec_private.pem \
chmod 644 keys/ec_public.pem
`
# 3. Execute docker compose
docker compose up -d --build
