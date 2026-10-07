# Certificado público do banco Supabase

`prod-ca-2021.crt` é o certificado público **Supabase Root 2021 CA**, obtido via HTTPS em:

https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

SHA-256: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.

Não contém chave privada ou credencial de projeto. A validade termina em 26/04/2031.
O script de migração o carrega para conexões Supabase e mantém a validação TLS
do certificado e do hostname. Nenhum certificado é instalado globalmente no Windows.

Para outra CA ou futura rotação, baixe o certificado em Database Settings → SSL
Configuration no painel Supabase e indique seu caminho em `DATABASE_SSL_CA_FILE`.
Veja https://supabase.com/docs/guides/database/connecting-to-postgres#connecting-with-ssl.
