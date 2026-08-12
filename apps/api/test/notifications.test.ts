import { describe, expect, it } from 'vitest';
import { bookingConfirmationNotification } from '../src/notifications/service.js';

describe('notification templates', () => {
  it('uses non-sensitive booking confirmation content and a dedupe key', () => {
    const message = bookingConfirmationNotification({ clinicId: 'clinic', patientEmail: 'patient@example.test', appointmentId: 'appointment', clinicName: 'Dentra Clinic', branchName: 'Main Branch', startsAt: '2030-01-10T02:00:00.000Z', dedupeKey: 'booking-confirmation:appointment' });
    expect(message.channel).toBe('email');
    expect(message.body).toContain('appointment request');
    expect(message.body).not.toMatch(/diagnosis|medication|procedure/i);
    expect(message.dedupeKey).toBe('booking-confirmation:appointment');
  });
});
