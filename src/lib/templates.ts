// Simple email templates renderer
const render = (
  template: string,
  vars: any = {},
): { subject: string; text: string } => {
  const { offerTitle, sponsorName, email, claimedAt } = {
    offerTitle: vars.offerTitle || vars.offer_title || "",
    sponsorName: vars.sponsorName || vars.sponsor_name || "",
    email: vars.email || "",
    claimedAt: vars.claimedAt || new Date().toLocaleString(),
  }

  if (template === "client-claim") {
    return {
      subject: `Offer Claimed: ${offerTitle}`,
      text: `You have successfully claimed the offer: ${offerTitle} from ${sponsorName}.\n\nYou will receive the sponsor details in your inbox shortly.\n\nFOST Digital Swag Marketplace`,
    }
  }

  if (template === "sponsor-claim") {
    return {
      subject: `New lead: ${offerTitle} claimed`,
      text: `Hi ${sponsorName} team,\n\nYou have a new lead from the FOST Digital Swag Marketplace — a FOST attendee just claimed your offer.\n\nOffer title: ${offerTitle}\nEmail: ${email}\nClaimed: ${claimedAt}\n\nThanks for being part of the marketplace,\nFOST Digital Swag Marketplace`,
    }
  }

  return { subject: "", text: "" }
}

module.exports = { render }
