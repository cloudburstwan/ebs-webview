export interface Contributor {
  name: string;
  role?: string[];
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
        name: "Cloudburst",
        role: ["Project Lead", "Developer"],
        avatarUrl: "https://avatars.githubusercontent.com/u/43821940?v=4",
        links: [
          { label: "GitHub", url: "https://github.com/cloudburstwan" }
        ]
      },
      {
        name: "Reiuiji",
        role: ["Developer"],
        avatarUrl: "https://avatars.githubusercontent.com/u/633476?v=4",
        links: [
          { label: "GitHub", url: "https://github.com/Reiuiji" }
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
  },
  {
    title: "Data Team",
    description: "The team in charge of managing telemetry and data insights",
    contributors: [
      {
        name: "Emma aka TheMadhatterbrony",
        role: ["Data Analyst"],
        avatarUrl: "https://cdn.discordapp.com/avatars/497028042573611008/adca9244ac4835f873ebc05491177598.webp?size=256",
        links: []
      }
    ]
  },
  {
    title: "Infrastrucure Team",
    description: "The team responsible for maintaining the platform's long-lived infrastructure.",
    contributors: [
      {
        name: "ScotchVA",
        role: ["Infrastructure Engineer"],
        avatarUrl: "https://cdn.discordapp.com/avatars/107217539041353728/3b6926431e9edb35ed4e227a1a65850b.webp?size=256",
        links: []
      }
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
