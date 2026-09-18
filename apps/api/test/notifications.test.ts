import { describe, expect, it } from 'vitest';
import { bookingConfirmationNotification, dentistVerificationNotification } from '../src/notifications/service.js';

describe('notification templates', () => {
  it('uses non-sensitive booking confirmation content and a dedupe key', () => {
    const message = bookingConfirmationNotification({ clinicId: 'clinic', patientName: 'Ana Santos', patientEmail: 'patient@example.test', appointmentId: 'appointment', confirmationNumber: 'DNT-20300110-ABC12345', serviceName: 'Consultation', dentistName: 'Dr. Maria Reyes', endsAt: '2030-01-10T02:30:00.000Z', clinicName: 'Dentra Clinic', branchName: 'Main Branch', startsAt: '2030-01-10T02:00:00.000Z', dedupeKey: 'booking-confirmation:appointment' });
    expect(message.channel).toBe('email');
    expect(message.body).toMatch(/^Hi Ana Santos,\n\nThank you for choosing Dentra Clinic/);
    expect(message.body).toContain('Warm regards,\nDentra Clinic team');
    expect(message.recipient).toBe('patient@example.test');
    expect(message.subject).toBe('Appointment request received — Dentra Clinic');
    for (const detail of ['appointment request', 'DNT-20300110-ABC12345', 'Clinic: Dentra Clinic', 'Branch: Main Branch', 'Service: Consultation', 'Dentist: Dr. Maria Reyes', 'January 10, 2030', '10:00', '10:30', 'Philippine Time, UTC+08:00', 'not yet confirmed']) {
      expect(message.body).toContain(detail);
    }
    expect(message.body).not.toMatch(/diagnosis|medication|procedure/i);
    expect(message.dedupeKey).toBe('booking-confirmation:appointment');
  });

  it('holds a safe, fully rendered dentist verification email for Super Admin preview', () => {
    const message = dentistVerificationNotification({
      dentistName: 'Maria Reyes',
      recipient: 'maria@example.test',
      status: 'approved',
      reason: 'PRC identity and submitted credentials matched.',
      dedupeKey: 'verification:submission:approved',
    });
    expect(message).toMatchObject({
      channel: 'email',
      type: 'dentist_verification_approved',
      status: 'held',
      recipient: 'maria@example.test',
    });
    expect(message.body).toContain('PRC identity and submitted credentials matched.');
    expect(message.body).not.toMatch(/storage|document\/|https?:\/\//i);
  });
});
