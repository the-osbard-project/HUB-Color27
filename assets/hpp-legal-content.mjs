import {
  LEGAL_LAST_UPDATED,
  LEGAL_PAGE_URL,
  LEGAL_PDF_HREF,
} from './legal-manifest.mjs';

/** @returns {string} */
export function buildHppLegalTwoColHtml() {
  const navItems = [
    { id: 'hpp-platform-hosting', label: 'Platform Hosting & Analytics Disclosure' },
    { id: 'hpp-coppa', label: "Children's Privacy Policy (COPPA Notice)" },
    { id: 'hpp-contact', label: 'Contact Osbard Studio' },
    { id: 'hpp-copyright-trademark', label: 'Copyright & Trademark Ecosystem' },
    { id: 'hpp-human-creator', label: 'Human Creator Guarantee & AI Usage Policy' },
    { id: 'hpp-do-not-sell', label: 'Do Not Sell or Share My Personal Information' },
    { id: 'hpp-gdpr', label: 'GDPR Privacy Notice' },
    { id: 'hpp-privacy', label: 'Privacy Policy' },
    { id: 'hpp-terms', label: 'Terms and Conditions' },
  ];

  const platformHostingBody =
    '<h2>Platform Hosting &amp; Analytics Disclosure</h2>' +
    `<p><strong>Last Updated: ${LEGAL_LAST_UPDATED}</strong></p>` +
    '<p><strong>Zero-Data OSS Environment:</strong> OSBARD, INC. operates <strong>Osbard&rsquo;s Storybook Studio</strong> and all related <strong>OSS</strong> properties under one <strong>&ldquo;Zero-Data&rdquo;</strong> structural framework. That includes the Lobby at <strong>osbard.com</strong> and the desks at <strong>studio.osbard.com</strong> (Studio), <strong>color.osbard.com</strong> (Color Time!), <strong>scrippy.osbard.com</strong> (Scrippy), <strong>builder.osbard.com</strong> (Builder), <strong>reader.osbard.com</strong> (Reader), <strong>scoopy.osbard.com</strong> (Scoopy), <strong>pixer.osbard.com</strong> (Pixer), and other <strong>*.osbard.com</strong> surfaces (including planned desks such as <strong>Player</strong> and <strong>Fonty</strong>).</p>' +
    '<ul>' +
    '<li><strong>No accounts required:</strong> We do not require, prompt, or authorize account creation, age-gated profiles, or backend storage of creative work within OSS apps or on osbard.com.</li>' +
    '<li><strong>Client-side workspace:</strong> Canvas state, layers, strokes, and project files remain in the user&rsquo;s device browser storage (<strong>LocalStorage</strong> and local files). OSBARD, INC. does not operate servers designed to preview, scan, intercept, or retrieve creative data from the OSS sandboxes.</li>' +
    '<li><strong>No Google Analytics (GA4):</strong> OSBARD, INC. does not deploy <strong>Google Analytics</strong>, <strong>GA4</strong>, ad pixels, cross-site trackers, or behavioral profiling libraries on OSS properties, and does not add GA4 to OSBARD, INC. Substack publications (including <strong>Osbard&rsquo;s ABCs</strong> at osbard.substack.com). Substack is a separate writer lane; it does not host osbard.com.</li>' +
    '<li><strong>Anonymous traffic chalkboard (optional):</strong> Where enabled, <strong>Tally</strong> records cookieless visit counts by app, country, and arrival (direct, another OSS page, or the referring site&rsquo;s hostname only)&mdash;no cookies, no visitor id, no IP stored, no individual profiling, no ad matching, no sale of data. Counts are mailed daily and then wiped. Tally does not collect data about the person or their art.</li>' +
    '</ul>' +
    '<p><strong>Architectural guarantee:</strong> The OSS codebase programmatically bars third-party marketing tags and identity trackers from executing inside Storybook Studio and aligned OSS web builds.</p>';

  const coppaBody =
    "<h2>Children's Privacy Policy (COPPA Notice)</h2>" +
    '<p>Osbard&rsquo;s Storybook Studio and all OSS properties under OSBARD, INC. are organized around a strict <strong>&ldquo;Zero-Data&rdquo; creative philosophy</strong>. Younger creators must retain absolute freedom to learn, sketch, and develop skills without digital tracking, targeted profiling, behavioral tracking, or operational capitalization.</p>' +
    '<h3>A. The &ldquo;Zero-Data&rdquo; Sandbox Infrastructure</h3>' +
    '<ul>' +
    '<li><strong>Anonymity by Default:</strong> Usage of our creative tools requires zero signup, email indexing, age verification checks, or persistent profile setup.</li>' +
    '<li><strong>Localized Device Encapsulation:</strong> Creative assets, technical canvas state matrices, layer objects, and dynamic workspace layouts reside completely inside the physical device&rsquo;s client browser storage (cache/LocalStorage). OSBARD, INC. possesses no server infrastructure, APIs, or database systems designed to preview, scan, intercept, or retrieve creative data generated inside the app sandbox.</li>' +
    '<li><strong>Exclusion of Passive Fingerprinting:</strong> OSS apps and web surfaces explicitly ban third-party tracking, cookie-based ad networks, and identity profiling tools.</li>' +
    '</ul>' +
    '<h3>B. Zero-Data Web Surfaces &amp; OSS Apps</h3>' +
    '<p><strong>osbard.com</strong> (Lobby), <strong>Studio</strong>, <strong>Color Time!</strong> (Color Time Machine!), <strong>Scrippy</strong>, <strong>Scoopy</strong>, <strong>Builder</strong>, <strong>Reader</strong>, <strong>Pixer</strong>, and planned desks such as <strong>Player</strong> and <strong>Fonty</strong> are static, Zero-Data experiences. We do not operate newsletter signup flows, behavioral ad campaigns, Google Analytics (GA4), or child-directed marketing registration on OSS-hosted properties.</p>' +
    '<p>We do not knowingly collect, profile, or register children under the age of 13. OSBARD, INC. can receive identifiable information about a child only if a parent or legal guardian initiates direct contact (for example, by email).</p>' +
    '<h3>C. Data Lifecycle, Retention, &amp; Purging Rules</h3>' +
    '<ul>' +
    '<li><strong>Direct Communications Catch:</strong> OSBARD, INC. can only receive identifiable personal elements (such as an email address or signature details) if a parent or legal guardian manually initiates direct contact via communication protocols.</li>' +
    '<li><strong>Immediate Purge Trigger:</strong> We maintain zero storage logs for children&rsquo;s details. If technical auditing reveals an inadvertent data transmission matching a child under 13, all related records are wiped out immediately.</li>' +
    '<li><strong>Third-Party Selling Bar:</strong> Data brokering, corporate ad matching, or advertising network distribution is completely banned across all operational units.</li>' +
    '</ul>' +
    '<h3>D. Comprehensive Parental Oversight Safeguards</h3>' +
    '<p>Pursuant to the Children&rsquo;s Online Privacy Protection Act (COPPA), parents retain absolute authority to inspect, enforce removal of, or shut down further processing pipelines concerning any specific details transmitted via personal emails.</p>' +
    '<p><strong>Designated Data Privacy Officer:</strong><br>OSBARD, INC. | Attn: J. S. Shepard<br>60 Lester Ave, Nashville, TN 37210<br><strong>Inquiries Contact:</strong> <a href="mailto:coppa@osbard.com">coppa@osbard.com</a></p>';

  const contactBody =
    '<h2>Contact Osbard Studio</h2>' +
    '<p>The operating titles <strong>&ldquo;Osbard&rsquo;s Storybook Studio&rdquo;</strong> and <strong>&ldquo;Osbard Studio&rdquo;</strong> constitute registered and legally recognized Assumed Names under the formal corporate registry of <strong>OSBARD, INC.</strong> Legal notices, operational suggestions, partnership proposals, or structural questions should be filed directly via the monitored inbox: <a href="mailto:contact-osbard@osbard.com">contact-osbard@osbard.com</a>.</p>';

  const copyrightTrademarkBody =
    '<h2>Copyright &amp; Trademark Ecosystem</h2>' +
    '<p>All brand titles, specialized vocabulary, asset packages, mechanical systems, and graphic representations compiled under this directory remain the exclusive property of OSBARD, INC. and are fully protected under United States and international intellectual property laws.</p>' +
    '<h3>Corporate &amp; Brand Anchors</h3><ul>' +
    '<li>OSBARD, INC.™ · Osbard&rsquo;s Storybook Studio™ · Osbard Studio™ · Osbard™ · Osbard.com™ · Osbard WIP [Work In Progress]™ · Osbard&rsquo;s Digital Theater of Arrt!!™ · SMUDGIES!™ · SHARKIES!™ · OSBARD!!™</li>' +
    '</ul>' +
    '<h3>The PIT Crew Universe</h3><ul>' +
    '<li>PIT Crew™ (Pirates-In-Training Crew) · PIT Crew Chronicles™ · PIT Crew&rsquo;s News™ · Harkee!™ · Uncounted Adventures™ · UNCOUNTED™</li>' +
    '</ul>' +
    '<h3>Live App Interfaces &amp; Pack Modules</h3><ul>' +
    '<li>Studio™ · Color Time!™ · Color Time Machine!™ · Scrippy™ · Scoopy™ · Builder™ · Builder Bindery™ · Reader™ · Pixer™ · Player™ · Fonty™ · Made of Arrt!!™ · Skills Builder™ · Scene Builder™ · Character Builder™ · Script Builder™ · Storybook Builder™</li>' +
    '</ul>' +
    '<h3>Taglines</h3>' +
    '<p>Slogans, taglines, and other short-form promotional language used across OSS properties and the apps&mdash;whether or not listed in this document&mdash;are likewise the intellectual property of OSBARD, INC.</p>' +
    '<h3>Published Stories &amp; Mottos</h3><ul>' +
    '<li>&ldquo;All are welcome. All are included. So all aboard!&rdquo;™ · &ldquo;(Searching for) DOG.&rdquo;™ · &ldquo;DOG: Crossroads Coloring Edition&rdquo;™ · &ldquo;Ponder Yonder&rdquo;™</li>' +
    '</ul>' +
    '<p><strong>Character Property Matrix:</strong> The narrative outlines, distinctive color codes, structural geometry, vectors, names, and visual behaviors of the characters <strong>Smudgies</strong> and <strong>Sharkies</strong> are protected character properties. Any reproduction, mechanical derivation, scraping, redistribution, or unauthorized placement is strictly forbidden.</p>' +
    '<p><em>The omission of any specific product designation, brand mark, or unique tool title from this list does not signal a forfeiture or waiver of any intellectual property rights established by OSBARD, INC.</em></p>';

  const humanCreatorBody =
    '<h2>Human Creator Guarantee &amp; AI Usage Policy</h2>' +
    '<p>OSBARD, INC. maintains an uncompromising position regarding the protection and absolute defense of original human creativity. Every single asset deployed in our ecosystems&mdash;including literary storytelling text, illustrations, structural blueprints, background components, UI layouts, character silhouettes, and engine design schemas&mdash;is <strong>100% human-conceived, drafted, and finalized by real artists</strong>.</p>' +
    '<p>We restrict the deployment of Artificial Intelligence systems exclusively to structural validation, technical software engineering optimizations, script debugging, and metadata file organization. We strictly bar generative models from producing user-facing narratives, portfolio artwork, or defining the fundamental design aesthetics of the brand.</p>';

  const doNotSellBody =
    '<h2>Do Not Sell or Share My Personal Information</h2>' +
    '<p><strong>OSBARD, INC. under no scenario barters, rents, or sells consumer records to third parties for financial compensation.</strong></p>' +
    '<ul>' +
    '<li><strong>Zero-Data OSS Architecture:</strong> OSS apps and web properties forbid ad-targeting tags, tracking pixels, cross-domain behavior trackers, and marketing analytics stacks.</li>' +
    '<li><strong>No behavioral ad matching:</strong> We do not build advertising profiles from OSS usage, osbard.com visits, or Studio sessions. There is no Google Analytics (GA4) on OSS properties or on OSBARD, INC. Substack publications.</li>' +
    '<li><strong>Global Privacy Control (GPC):</strong> Valid GPC signals are honored across OSS web surfaces we control.</li>' +
    '<li><strong>Opt-Out Protocols:</strong> To request deletion of any email or correspondence we hold from a direct inquiry, send a manual directive to: <a href="mailto:opt-out-request@osbard.com">opt-out-request@osbard.com</a>.</li>' +
    '</ul>';

  const gdprBody =
    '<h2>GDPR Privacy Notice (EEA/UK/CH)</h2>' +
    '<p><strong>Data Controller Entity:</strong> OSBARD, INC., managed under J. S. Shepard, 60 Lester Ave, Nashville, TN 37210, USA.</p>' +
    '<p><strong>Limited Sub-Processor Matrix:</strong> OSS operates as a Zero-Data environment. We partner only with processors required to deliver static web hosting and anonymous, non-profiling telemetry:</p>' +
    '<ol>' +
    '<li><strong>Web hosting / CDN:</strong> Edge delivery for <strong>osbard.com</strong>, <strong>studio.osbard.com</strong>, <strong>color.osbard.com</strong>, <strong>scrippy.osbard.com</strong>, <strong>builder.osbard.com</strong>, <strong>reader.osbard.com</strong>, <strong>scoopy.osbard.com</strong>, <strong>pixer.osbard.com</strong>, and related OSS static assets.</li>' +
    '<li><strong>Tally (where enabled):</strong> Cookieless visit counts by app, country, and arrival hostname on <strong>tally.osbard.com</strong>&mdash;no individual user profiles. Counts are mailed daily and then wiped.</li>' +
    '</ol>' +
    '<p><strong>Processing Minimization Constraints:</strong> Creative work stays on client devices. We retain personal data only when you voluntarily email us. Processing rests on <strong>Legitimate Interest</strong> or <strong>Consent</strong> and may be challenged via <a href="mailto:GDPR@osbard.com">GDPR@osbard.com</a>.</p>';

  const privacyBody =
    '<h2>Privacy Policy</h2>' +
    '<p><strong>Architecture Rules:</strong> Storybook Studio and the other OSS desks run via client browser local memory storage. User canvas layouts, strokes, and layers are never transmitted to our servers for storage or inspection. OSS web surfaces do not deploy Google Analytics (GA4), marketing analytics, ad networks, or cross-site trackers.</p>' +
    '<p><strong>Data Points Collected:</strong> Optional emails you send us directly; anonymous aggregated visit counts via Tally where enabled (app, country, and arrival host only; no cookies; no individual tracking; daily mail then wipe). Data in transit is protected with SSL/TLS. Contact <a href="mailto:privacy@osbard.com">privacy@osbard.com</a> for access or deletion requests.</p>';

  const termsBody =
    '<h2>Terms and Conditions</h2>' +
    '<p><strong>Ownership of Work:</strong> Users maintain full copyright, ownership, and reproduction authority over all original illustrations created inside the application workspace. OSBARD, INC. retains all legal protections for code, assets, and character brands.</p>' +
    '<p><strong>Data &amp; Storage Responsibility:</strong> <strong>We maintain no central user backups.</strong> Workspace layouts live solely inside the client&rsquo;s local storage. System cache clearing or device issues will cause permanent data loss. Regular manual exporting is required. Tools are delivered completely <strong>&ldquo;As-Is&rdquo;</strong> with no operational liabilities.</p>' +
    '<ul>' +
    '<li><strong>Separate writer lane:</strong> Visiting OSBARD, INC. publications on Substack (for example, Osbard&rsquo;s ABCs) is subject to Substack&rsquo;s own terms. Substack does not host osbard.com or the OSS desks.</li>' +
    '<li><strong>Prohibitions:</strong> No illegal content; no reverse-engineering or scraping the site infrastructure.</li>' +
    '<li><strong>Governing Law:</strong> Legal matters fall strictly under the jurisdiction of the courts of Nashville, TN.</li>' +
    '<li><strong>Contact:</strong> <a href="mailto:terms@osbard.com">terms@osbard.com</a></li>' +
    '</ul>';

  const tocList = navItems
    .map((item) => `<li><a href="#${item.id}" class="hpp-legal-toc-link">${item.label}</a></li>`)
    .join('');

  const bodySections =
    `<section id="hpp-platform-hosting" class="hpp-legal-section">${platformHostingBody}</section>` +
    '<hr class="hpp-legal-section-divider" aria-hidden="true">' +
    `<section id="hpp-coppa" class="hpp-legal-section">${coppaBody}</section>` +
    '<hr class="hpp-legal-section-divider" aria-hidden="true">' +
    `<section id="hpp-contact" class="hpp-legal-section">${contactBody}</section>` +
    '<hr class="hpp-legal-section-divider" aria-hidden="true">' +
    `<section id="hpp-copyright-trademark" class="hpp-legal-section">${copyrightTrademarkBody}</section>` +
    '<hr class="hpp-legal-section-divider" aria-hidden="true">' +
    `<section id="hpp-human-creator" class="hpp-legal-section">${humanCreatorBody}</section>` +
    '<hr class="hpp-legal-section-divider" aria-hidden="true">' +
    `<section id="hpp-do-not-sell" class="hpp-legal-section">${doNotSellBody}</section>` +
    '<hr class="hpp-legal-section-divider" aria-hidden="true">' +
    `<section id="hpp-gdpr" class="hpp-legal-section">${gdprBody}</section>` +
    '<hr class="hpp-legal-section-divider" aria-hidden="true">' +
    `<section id="hpp-privacy" class="hpp-legal-section">${privacyBody}</section>` +
    '<hr class="hpp-legal-section-divider" aria-hidden="true">' +
    `<section id="hpp-terms" class="hpp-legal-section">${termsBody}</section>`;

  return (
    '<div class="hpp-legal-two-col">' +
    '<aside class="hpp-legal-nav" aria-label="Legal sections">' +
    '<h2 class="hpp-legal-nav-title">Legal</h2>' +
    '<nav class="hpp-legal-toc" aria-label="Policy sections">' +
    `<ul>${tocList}</ul>` +
    '</nav>' +
    '<div class="hpp-legal-download-row">' +
    `<a href="${LEGAL_PDF_HREF}" class="hpp-legal-download" target="_blank" rel="noopener"><i class="ph-fill ph-download-simple" aria-hidden="true"></i> Download PDF</a>` +
    `<p class="hpp-legal-sidebar-external">Open <a href="${LEGAL_PAGE_URL}" class="hpp-legal-sidebar-external-link" target="_blank" rel="noopener noreferrer" aria-label="Terms, Privacy and Web Safety — opens in new window">Terms, Privacy &amp; Web Safety</a> in new window.</p>` +
    '</div>' +
    '<div class="hpp-legal-thumbnails" aria-hidden="true"></div>' +
    '</aside>' +
    '<div class="hpp-legal-doc">' +
    `<div class="hpp-legal-body">${bodySections}</div>` +
    '</div>' +
    '</div>'
  );
}
