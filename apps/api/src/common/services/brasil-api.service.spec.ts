import { InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { BrasilApiService } from './brasil-api.service';

describe('BrasilApiService', () => {
  let service: BrasilApiService;
  let clientGet: jest.Mock;

  beforeEach(() => {
    service = new BrasilApiService();
    clientGet = jest.fn();

    (
      service as unknown as {
        client: { get: jest.Mock };
      }
    ).client.get = clientGet;

    jest.spyOn(axios, 'isAxiosError').mockImplementation(() => false);
  });

  it('should sanitize cnpj and return data', async () => {
    clientGet.mockResolvedValue({
      data: {
        cnpj: '12345678000199',
        razao_social: 'Cinema LTDA',
        nome_fantasia: 'Cinema',
        opcao_pelo_simples: true,
      },
    });

    const result = await service.getCnpjData('12.345.678/0001-99');

    expect(clientGet).toHaveBeenCalledWith('/cnpj/v1/12345678000199');
    expect(result).toEqual(expect.objectContaining({ cnpj: '12345678000199' }));
  });

  it('should return null for cnpj when brasil api responds 404', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    clientGet.mockRejectedValue({
      response: { status: 404 },
      message: 'not found',
    });

    await expect(service.getCnpjData('00.000.000/0000-00')).resolves.toBeNull();
  });

  it('should throw internal server error for cnpj on non-404 axios error', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    clientGet.mockRejectedValue({
      response: { status: 500 },
      message: 'server error',
    });

    await expect(service.getCnpjData('12.345.678/0001-99')).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('should sanitize cep and return data', async () => {
    clientGet.mockResolvedValue({
      data: {
        cep: '01001000',
        state: 'SP',
        city: 'São Paulo',
      },
    });

    const result = await service.getCepData('01001-000');

    expect(clientGet).toHaveBeenCalledWith('/cep/v1/01001000');
    expect(result).toEqual(expect.objectContaining({ cep: '01001000' }));
  });

  it('should return null for cep on any axios error', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    clientGet.mockRejectedValue({
      response: { status: 500 },
      message: 'error',
    });

    await expect(service.getCepData('01001-000')).resolves.toBeNull();
  });

  it('should find municipality case-insensitive and accent-insensitive', async () => {
    clientGet.mockResolvedValue({
      data: [
        {
          nome: 'Sao Paulo',
          codigo_ibge: '3550308',
          estado: { sigla: 'SP', nome: 'São Paulo' },
        },
      ],
    });

    const result = await service.getMunicipalityByCityAndState(
      'São Paulo',
      'SP',
    );

    expect(clientGet).toHaveBeenCalledWith('/ibge/municipios/v1/SP');
    expect(result).toEqual({
      nome: 'Sao Paulo',
      codigo_ibge: '3550308',
      estado: { sigla: 'SP', nome: 'São Paulo' },
    });
  });

  it('should return null when municipality is not found', async () => {
    clientGet.mockResolvedValue({
      data: [{ nome: 'Campinas', codigo_ibge: '3509502' }],
    });

    await expect(
      service.getMunicipalityByCityAndState('São Paulo', 'SP'),
    ).resolves.toBeNull();
  });
});
