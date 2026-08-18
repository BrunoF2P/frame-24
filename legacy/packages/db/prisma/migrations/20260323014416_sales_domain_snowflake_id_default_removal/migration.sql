-- AddForeignKey
ALTER TABLE "contracts"."exhibition_contracts" ADD CONSTRAINT "exhibition_contracts_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "catalog"."movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"."exhibition_contracts" ADD CONSTRAINT "exhibition_contracts_cinema_complex_id_fkey" FOREIGN KEY ("cinema_complex_id") REFERENCES "operations"."cinema_complexes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"."exhibition_contracts" ADD CONSTRAINT "exhibition_contracts_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "inventory"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
