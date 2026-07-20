export type SaidaExportRow = {
  data_saida: string;
  motorista: string;
  placa: string;
  qr_saca: string;
  codigo_nx: string;
  hora_saida: string;
  status: string;
  qtd_insucessos: number;
};

export function downloadSaidasCsv(rows: SaidaExportRow[], filename: string) {
  const header = [
    'Data',
    'Motorista',
    'Placa',
    'QR Saca',
    'Código NX',
    'Hora Saída',
    'Status',
    'Qtd Insucessos',
  ];
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(';')];
  for (const r of rows) {
    lines.push(
      [
        r.data_saida,
        r.motorista,
        r.placa,
        r.qr_saca,
        r.codigo_nx,
        r.hora_saida,
        r.status,
        r.qtd_insucessos,
      ]
        .map(esc)
        .join(';'),
    );
  }
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
