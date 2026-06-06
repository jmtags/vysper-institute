import { supabase } from './supabase';

export type CertificateStatus = 'active' | 'revoked' | 'archived';

export interface CertificateRecord {
  id: string;
  certificate_number: string;
  recipient_name: string;
  program_title: string;
  issued_date: string;
  completion_date: string | null;
  facilitator_name: string | null;
  remarks: string | null;
  status: CertificateStatus;
  created_at: string;
  updated_at: string;
}

export interface BulkCertificateInput {
  certificateNumber: string;
  recipientName: string;
  programTitle: string;
  issuedDate: string;
  completionDate?: string;
  facilitatorName?: string;
  remarks?: string;
  status: CertificateStatus;
}

export async function verifyCertificate(certificateNumber: string) {
  const normalizedCode = certificateNumber.trim().toUpperCase();
  if (!normalizedCode) {
    throw new Error('Please enter a certificate number.');
  }

  const { data, error } = await supabase
    .from('certificates')
    .select('id, certificate_number, recipient_name, program_title, issued_date, completion_date, facilitator_name, remarks, status, created_at, updated_at')
    .eq('certificate_number', normalizedCode)
    .maybeSingle();

  if (error) throw error;
  return data as CertificateRecord | null;
}

export async function fetchCertificates() {
  const { data, error } = await supabase
    .from('certificates')
    .select('id, certificate_number, recipient_name, program_title, issued_date, completion_date, facilitator_name, remarks, status, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CertificateRecord[];
}

export async function upsertCertificate(input: {
  id?: string;
  certificateNumber: string;
  recipientName: string;
  programTitle: string;
  issuedDate: string;
  completionDate?: string;
  facilitatorName?: string;
  remarks?: string;
  status: CertificateStatus;
}) {
  const payload = {
    certificate_number: input.certificateNumber.trim().toUpperCase(),
    recipient_name: input.recipientName.trim(),
    program_title: input.programTitle.trim(),
    issued_date: input.issuedDate,
    completion_date: input.completionDate || null,
    facilitator_name: input.facilitatorName || null,
    remarks: input.remarks || null,
    status: input.status
  };

  const query = input.id
    ? supabase.from('certificates').update(payload).eq('id', input.id)
    : supabase.from('certificates').insert(payload);

  const { error } = await query;
  if (error) throw error;
}

export async function bulkUpsertCertificates(inputs: BulkCertificateInput[]) {
  if (inputs.length === 0) {
    throw new Error('No certificate rows found for import.');
  }

  const payload = inputs.map((input) => ({
    certificate_number: input.certificateNumber.trim().toUpperCase(),
    recipient_name: input.recipientName.trim(),
    program_title: input.programTitle.trim(),
    issued_date: input.issuedDate,
    completion_date: input.completionDate || null,
    facilitator_name: input.facilitatorName || null,
    remarks: input.remarks || null,
    status: input.status
  }));

  const { error } = await supabase
    .from('certificates')
    .upsert(payload, { onConflict: 'certificate_number' });

  if (error) throw error;
}

export async function updateCertificateStatus(id: string, status: CertificateStatus) {
  const { error } = await supabase
    .from('certificates')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}
