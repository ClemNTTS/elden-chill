/** Transfert synchrone et idempotent des runes portees vers le coffre. */
export const encaisserRunes = (profile) => {
  const montant = profile.runes.carried;
  profile.runes.banked += montant;
  profile.runes.carried = 0;
  return montant;
};
