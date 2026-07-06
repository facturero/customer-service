import { IdentificationValidator } from '../../application/ports';

export class EcuadorIdentificationValidator implements IdentificationValidator {
  validate(_countryCode: string, typeCode: string, value: string): boolean {
    const cleaned = value.replace(/\D/g, '');

    if (typeCode === 'RUC') {
      return cleaned.length === 13 && this.validarCedula(cleaned.substring(0, 10)) && cleaned.endsWith('001');
    }

    if (typeCode === 'CEDULA') {
      return cleaned.length === 10 && this.validarCedula(cleaned);
    }

    return false;
  }

  private validarCedula(cedula: string): boolean {
    if (cedula.length !== 10) return false;

    const provincia = parseInt(cedula.substring(0, 2), 10);
    if (provincia < 1 || provincia > 24) return false;

    const tercerDigito = parseInt(cedula[2], 10);
    if (tercerDigito > 6) return false;

    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;

    for (let i = 0; i < 9; i++) {
      let producto = parseInt(cedula[i], 10) * coeficientes[i];
      if (producto >= 10) producto -= 9;
      suma += producto;
    }

    const digitoVerificador = parseInt(cedula[9], 10);
    const decenaSuperior = Math.ceil(suma / 10) * 10;
    const digitoCalculado = decenaSuperior - suma;

    return digitoCalculado === (digitoVerificador === 0 ? 0 : digitoVerificador);
  }
}
