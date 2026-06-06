import { FormEvent, useState } from 'react';
import { Award, BadgeCheck, Search, ShieldAlert } from 'lucide-react';
import { Button } from '../components/Button';
import { BRAND_NAME } from '../branding';
import { CertificateRecord, verifyCertificate } from '../lib/certificates';

export function VerifyPage() {
  const [certificateNumber, setCertificateNumber] = useState('');
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setCertificate(null);
    setSearched(false);

    try {
      const result = await verifyCertificate(certificateNumber);
      setCertificate(result);
      setSearched(true);
    } catch (err: any) {
      setError(err.message ?? 'Unable to verify certificate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-8 items-start">
          <section>
            <p className="text-secondary mb-3" style={{ fontWeight: 600 }}>Certificate Verification</p>
            <h1 className="mb-4 text-primary">Verify a VYSPER Certificate</h1>
            <p className="text-lg text-foreground/70 leading-relaxed">
              Enter the certificate number exactly as printed on the certificate to confirm whether it was issued by {BRAND_NAME}.
            </p>
            <div className="mt-8 rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-3">
                <Award className="w-6 h-6 text-secondary mt-1" />
                <div>
                  <h2 className="text-primary mb-2">For clients and partner organizations</h2>
                  <p className="text-sm text-foreground/70">
                    This page confirms certificate authenticity, recipient name, program title, and issue date. For corrections, contact VYSPER Institute directly.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-card rounded-xl shadow-sm border border-border p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-2">Certificate Number</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={certificateNumber}
                    onChange={(event) => setCertificateNumber(event.target.value.toUpperCase())}
                    placeholder="e.g., VYS-CERT-2026-0001"
                    className="flex-1 px-4 py-3 bg-input-background rounded-lg border border-border"
                    required
                  />
                  <Button type="submit" disabled={loading}>
                    <Search className="w-4 h-4" />
                    {loading ? 'Checking...' : 'Verify'}
                  </Button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </form>

            <div className="mt-8">
              {certificate && (
                <VerificationResult certificate={certificate} />
              )}

              {searched && !certificate && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-6 h-6 text-destructive mt-1" />
                    <div>
                      <h2 className="text-destructive mb-2">Certificate Not Found</h2>
                      <p className="text-sm text-foreground/70">
                        We could not find an active VYSPER Institute certificate with that number. Please check the code and try again.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function VerificationResult({ certificate }: { certificate: CertificateRecord }) {
  const isValid = certificate.status === 'active';

  return (
    <div className={`rounded-xl border p-6 ${
      isValid
        ? 'border-secondary/30 bg-secondary/10'
        : 'border-destructive/20 bg-destructive/5'
    }`}>
      <div className="flex items-start gap-3 mb-5">
        {isValid ? (
          <BadgeCheck className="w-7 h-7 text-secondary mt-1" />
        ) : (
          <ShieldAlert className="w-7 h-7 text-destructive mt-1" />
        )}
        <div>
          <h2 className={isValid ? 'text-secondary' : 'text-destructive'}>
            {isValid ? 'Certificate Verified' : 'Certificate Revoked'}
          </h2>
          <p className="text-sm text-foreground/70 mt-1">
            {isValid
              ? 'This certificate record is active in the VYSPER Institute verification system.'
              : 'This certificate exists but is no longer valid.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <VerifyInfo label="Certificate Number" value={certificate.certificate_number} />
        <VerifyInfo label="Status" value={isValid ? 'Verified' : 'Revoked'} />
        <VerifyInfo label="Recipient" value={certificate.recipient_name} />
        <VerifyInfo label="Program" value={certificate.program_title} />
        <VerifyInfo label="Issued Date" value={new Date(certificate.issued_date).toLocaleDateString()} />
        <VerifyInfo label="Completion Date" value={certificate.completion_date ? new Date(certificate.completion_date).toLocaleDateString() : 'Not specified'} />
        <VerifyInfo label="Facilitator" value={certificate.facilitator_name || 'Not specified'} />
        {certificate.remarks && <VerifyInfo label="Remarks" value={certificate.remarks} />}
      </div>
    </div>
  );
}

function VerifyInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card/80 border border-border p-3">
      <p className="text-xs text-foreground/60">{label}</p>
      <p className="text-foreground/90 mt-1" style={{ fontWeight: 600 }}>{value}</p>
    </div>
  );
}
