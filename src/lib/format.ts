export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-FR").format(price) + " DA";
}

export function timeAgo(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.floor(months / 12)} an(s)`;
}

export function auctionCountdown(isoEnd: string): { label: string; urgent: boolean; ended: boolean } {
  const diff = new Date(isoEnd).getTime() - Date.now();
  if (diff <= 0) return { label: "Enchère terminée", urgent: false, ended: true };

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const urgent = diff < 1000 * 60 * 60 * 3; // under 3 hours

  if (days > 0) return { label: `${days}j ${hours}h restantes`, urgent, ended: false };
  if (hours > 0) return { label: `${hours}h ${minutes}min restantes`, urgent, ended: false };
  return { label: `${minutes} min restantes`, urgent, ended: false };
}

export function currentBidAmount(listing: { price: number; bids: { amount: number }[] }): number {
  if (listing.bids.length === 0) return listing.price;
  return Math.max(...listing.bids.map((b) => b.amount));
}
