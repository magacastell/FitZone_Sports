-- El jti se comparte entre admisión online y reconciliación offline.
ALTER TABLE registro_acceso ADD COLUMN qr_jti text;
CREATE UNIQUE INDEX uk_registro_acceso_qr_jti ON registro_acceso(qr_jti) WHERE qr_jti IS NOT NULL;
