// Organizer bank details shown on the accommodation booking form.
// Update here if the account / UPI ID changes.
export const BANK = {
  name: 'Xpecto IIT Mandi',
  bank: 'Punjab National Bank',
  accountNo: '7315000100034536',
  ifsc: 'PUNB0731500',
  branch: 'IIT Kamand, Tehsil Sadar, Mandi, Himachal Pradesh',
  upiId: '8628963924m@pnb',
};

export const PAY_METHODS = [
  { id: 'upi', label: 'UPI', refLabel: 'UPI transaction ID' },
  { id: 'neft', label: 'NEFT / RTGS', refLabel: 'UTR / reference number' },
  { id: 'cheque', label: 'Cheque', refLabel: 'Cheque number' },
];
