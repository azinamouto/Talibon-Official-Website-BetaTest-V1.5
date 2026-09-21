import { Inject, Injectable } from "@nestjs/common";
import { ContentService } from '../content/content.service';
import { ListContentDto } from '../content/content.dto';

@Injectable()
export class NewsService {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  async getArticles() {
    const result = await this.content.list('news', Object.assign(new ListContentDto(), { category: 'ARTICLE' }));
    return result.data.map(row => ({ ...row, image: row.image_url }));
  }

  getAdvisories() {
    return [
      { id: 1, title: "Water Service Interruption", date: "2024-03-25", content: "Scheduled maintenance on March 26." },
    ];
  }

  getDisasterPreparedness() {
    return {
      title: "Disaster Preparedness & Emergency Hotlines",
      content: "Guidelines and emergency contacts for disaster preparedness in Talibon.",
      hotlines: [
        { name: "BFP Talibon", number: "09506329025" },
        { name: "PNP Talibon", number: "09985986442" },
        { name: "MDRRMO (TESaRU)", number: "09105035390" },
        { name: "RHU Talibon (DOH)", number: "09175620239" },
        { name: "PCG Talibon", number: "09096938871" },
        { name: "TARSIER", number: "117 / 09497955530 / 09175101490" },
        { name: "RHU Birthing Center", number: "(0919) 767 0072" },
        { name: "RHU Main", number: "(0963) 347 6355" },
      ],
      socials: {
        email: "talibonofficial@gmail.com",
        mayorOffice: "(038) 422-2895",
      },
    };
  }

  async getUpdates() {
    return (await this.content.list('news', Object.assign(new ListContentDto(), { category: 'UPDATE' }))).data;
  }

  getGallery() {
    return [
      { id: 1, url: "https://picsum.photos/seed/g1/800/600", caption: "Town Plaza" },
      { id: 2, url: "https://picsum.photos/seed/g2/800/600", caption: "Coastal View" },
    ];
  }

  getCommunity() {
    return {
      title: "Community News",
      content: "Updates and stories from the different barangays of Talibon.",
    };
  }

  getPublicNotices() {
    return [
      { id: 1, title: "Notice of Public Hearing", date: "2024-04-05" },
    ];
  }

  getDownloadableForms() {
    return [
      { id: 1, title: "Scholarship Application Form", url: "#" },
    ];
  }
}
