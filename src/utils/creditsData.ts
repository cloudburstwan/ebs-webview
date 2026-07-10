export interface Contributor {
  name: string;
  role?: string;
  avatarUrl?: string;
  links?: {
    label: string;
    url: string;
  }[];
}

export interface CreditSection {
  title: string;
  description?: string;
  contributors: Contributor[];
}

export const creditsData: CreditSection[] = [
  {
    title: "Development Team",
    description: "The core engineering team behind the platform and player experience.",
    contributors: [
      {
        name: "Reiuiji",
        role: "Developer",
        avatarUrl: "https://avatars.githubusercontent.com/u/633476?v=4",
        links: [
          { label: "GitHub", url: "https://github.com/Reiuiji" }
        ]
      },
      {
        name: "Cloudburst",
        role: "Developer",
        avatarUrl: "https://avatars.githubusercontent.com/u/43821940?v=4",
        links: [
          { label: "GitHub", url: "https://github.com/cloudburstwan" }
        ]
      }/*,
      {
        name: "Developer Name",
        role: "Frontend Developer",
        links: [
          { label: "Website", url: "https://example.com" }
        ]
      }*/
    ]
  }/*,
  {
    title: "Art & Design",
    description: "Creators of the beautiful themes, assets, and branding graphics.",
    contributors: [
      {
        name: "Artist Name",
        role: "UI/UX Designer",
        links: [
          { label: "Portfolio", url: "https://example.com" }
        ]
      }
    ]
  },
  {
    title: "QA & Testing",
    description: "Keeping the player stable, secure, and running smoothly.",
    contributors: [
      {
        name: "Tester Name",
        role: "Beta Tester"
      }
    ]
  },
  {
    title: "Translators",
    description: "Helping to localize the platform for viewers around the world.",
    contributors: [
      {
        name: "Translator Name",
        role: "French Localization"
      },
      {
        name: "Translator Name",
        role: "German Localization"
      }
    ]
  },
  {
    title: "Special Thanks",
    description: "Organizations and individuals who made this project possible.",
    contributors: [
      {
        name: "Pony Town Team",
        role: "Layout Inspiration",
        links: [
          { label: "Website", url: "https://pony.town" }
        ]
      },
      {
        name: "Open Source Community",
        role: "Supporting Libraries"
      }
    ]
  }*/
];
