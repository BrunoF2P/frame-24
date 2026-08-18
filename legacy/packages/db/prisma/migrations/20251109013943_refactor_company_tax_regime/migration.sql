/*
  Warnings:

  - You are about to drop the column `pis_cofins_regime` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the `pis_cofins_regimes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tax_regimes` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `tax_regime` to the `companies` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Remover as tabelas e a coluna que não são mais necessárias.
-- É seguro fazer isso primeiro.
DROP TABLE "identity"."pis_cofins_regimes";
DROP TABLE "identity"."tax_regimes";
ALTER TABLE "identity"."companies" DROP COLUMN "pis_cofins_regime";

-- Step 2: Criar o novo tipo ENUM para o regime tributário.
-- O banco de dados agora vai entender 'SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', etc. como tipos válidos.
CREATE TYPE "identity"."tax_regime_type" AS ENUM ('SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL');

-- Step 3: Remover a coluna de texto antiga 'tax_regime'.
-- É importante removê-la para que possamos criar a nova com o mesmo nome e o tipo correto.
ALTER TABLE "identity"."companies" DROP COLUMN "tax_regime";

-- Step 4: Adicionar a nova coluna 'tax_regime', mas como OPCIONAL (NULL) por enquanto.
-- Este é o passo crucial que evita o erro.
ALTER TABLE "identity"."companies" ADD COLUMN "tax_regime" "identity"."tax_regime_type";

-- Step 5: Preencher a nova coluna para TODAS as empresas que já existem no banco.
-- Vamos definir 'LUCRO_PRESUMIDO' como um valor padrão seguro para os dados existentes.
UPDATE "identity"."companies" SET "tax_regime" = 'LUCRO_PRESUMIDO' WHERE "tax_regime" IS NULL;

-- Step 6: Agora que todas as linhas têm um valor, podemos tornar a coluna OBRIGATÓRIA (NOT NULL).
-- Esta operação agora será bem-sucedida.
ALTER TABLE "identity"."companies" ALTER COLUMN "tax_regime" SET NOT NULL;

-- Step 7: Aplicar as outras pequenas mudanças que a migração detectou.
ALTER TABLE "identity"."companies" ALTER COLUMN "max_complexes" SET DEFAULT 1;

