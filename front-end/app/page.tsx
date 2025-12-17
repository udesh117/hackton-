import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="w-full min-w-[1440px] flex justify-center bg-white">
      <main className="relative w-[1440px] h-[10153px] bg-white overflow-hidden">
      {/* Top Banner */}
      <div className="absolute top-0 left-0 w-[1440px] h-[65px] bg-[#5425FF] flex items-center justify-center">
        <p className="text-white font-figtree text-[24px] leading-[120%] text-center">
          Hackathon begins in: 05 Days 12 Hours 46 Minutes
        </p>
      </div>

      {/* Hero Section - Group 35178 */}
      <div className="absolute left-[26.11px] top-[26px] w-[1388px] h-[971px]">
        {/* Rectangle 1 - Background */}
        <div className="absolute left-0 top-0 w-[1388px] h-[971px] bg-[#F2F2F2] rounded-2xl" />
        
        {/* Rectangle 2 - Larger background */}
        <div className="absolute left-[-29.02px] top-[-33px] w-[1446.04px] h-[1031px] bg-[#F3F3F3]" />

        {/* Decorative Background Groups */}
        <div className="absolute -left-[209.05px] top-[139px] w-[1983.37px] h-[1268px] opacity-30">
          <Image src="/images/hero-decoration.svg" alt="" width={1983} height={1268} className="w-full h-full" />
        </div>

        {/* Green Circles - Ellipses */}
        <div className="absolute left-[1395.1px] top-[686px] w-[45.8px] h-[45.77px] bg-[#24FF00] rounded-full shadow-[0px_0px_6.48px_2.05px_rgba(36,255,0,1)]" />
        <div className="absolute left-[548.95px] top-[851.87px] w-[45.8px] h-[45.77px] bg-[#24FF00] rounded-full shadow-[0px_0px_6.48px_2.05px_rgba(36,255,0,1)]" />
        <div className="absolute left-[1174.94px] top-[272px] w-[45.8px] h-[45.77px] bg-[#24FF00] rounded-full shadow-[0px_0px_6.48px_2.05px_rgba(36,255,0,1)]" />
        <div className="absolute left-[390.38px] top-[139px] w-[45.8px] h-[45.77px] bg-[#24FF00] rounded-full shadow-[0px_0px_6.48px_2.05px_rgba(36,255,0,1)]" />
        <div className="absolute left-[1101.08px] top-[897.64px] w-[45.8px] h-[45.77px] bg-[#24FF00] rounded-full shadow-[0px_0px_6.48px_2.05px_rgba(36,255,0,1)]" />
        <div className="absolute left-[130.11px] top-[466px] w-[45.77px] h-[45.77px] bg-[#24FF00] rounded-full shadow-[0px_0px_6.48px_2.05px_rgba(36,255,0,1)]" />

        {/* Stats Frame 10 */}
        <div className="absolute top-[496px] w-[1533.1px] h-[67px] flex items-center gap-[33px]" style={{ left: 'calc(50% - 1533.1px/2 - 0.39px)' }}>
          <div className="w-[505px] h-0 border border-[#BFBFBF]" />
          <div className="flex items-center justify-center gap-[120px] w-[456px] h-[67px]">
            <div className="flex flex-col items-center gap-1 w-[62px] h-[67px]">
              <p className="w-[62px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-[#5425FF]">5+</p>
              <p className="w-[62px] h-[29px] font-figtree text-[24px] leading-[29px] text-center text-[#5425FF]">Cities</p>
            </div>
            <div className="flex flex-col items-center gap-1 w-[65px] h-[67px]">
              <p className="w-[65px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-[#5425FF]">36</p>
              <p className="w-[65px] h-[29px] font-figtree text-[24px] leading-[29px] text-center text-[#5425FF]">Hours</p>
            </div>
            <div className="flex flex-col items-center gap-1 w-[89px] h-[67px]">
              <p className="w-[89px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-[#5425FF]">Offline</p>
              <p className="w-[89px] h-[29px] font-figtree text-[24px] leading-[29px] text-center text-[#5425FF]">Type</p>
            </div>
          </div>
          <div className="w-[505px] h-0 border border-[#BFBFBF]" />
        </div>

        {/* Hero Content Frame 1 */}
        <div className="absolute top-[196.88px] w-[844px] h-[264px] flex flex-col items-center" style={{ left: 'calc(50% - 844px/2 + 0.11px)' }}>
          <div className="flex flex-col items-center gap-2 w-[256px] h-[34px]">
            <p className="w-[256px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-[#6A6A6A]">March XX – April XX</p>
          </div>
          <h1 className="w-[1001px] h-[196px] font-silkscreen font-normal text-[153.429px] leading-[196px] tracking-[0.17em] text-black">HackOnX</h1>
          <p className="w-[844px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-[#6A6A6A]">India's Multi-State HPC Hackathon</p>
        </div>

        {/* Buttons Frame 9 */}
        <div className="absolute top-[603px] w-[281px] h-[48px] flex items-center gap-3" style={{ left: 'calc(50% - 281px/2 + 0.11px)' }}>
          <Link href="/signup" className="flex items-center justify-center px-6 py-3 gap-[10px] w-[171px] h-[48px] bg-[#5425FF] hover:bg-[#4319CC] transition-colors">
            <span className="w-[123px] h-[24px] font-figtree font-medium text-[20px] leading-[24px] text-center text-white">Register Now</span>
          </Link>
          <Link href="/login" className="box-border flex items-center justify-center px-6 py-3 gap-[10px] w-[98px] h-[48px] bg-white border border-[#5425FF] hover:bg-[#F9F9F9] transition-colors">
            <span className="w-[50px] h-[24px] font-figtree font-medium text-[20px] leading-[24px] text-center text-[#5425FF]">Login</span>
          </Link>
        </div>
      </div>

      {/* Decorative Groups */}
      <div className="absolute left-[88px] top-[3630px] w-[105.27px] h-[121.27px] -rotate-[44.83deg]">
        <Image src="/images/decoration-1.svg" alt="" width={105} height={121} />
      </div>
      <div className="absolute left-[1217.94px] top-[1033.33px] w-[105.27px] h-[121.27px] -rotate-[44.83deg]">
        <Image src="/images/decoration-2.svg" alt="" width={105} height={121} />
      </div>
      <div className="absolute left-[1362.29px] top-[3489.8px] w-[105.27px] h-[121.27px] rotate-[32.83deg]">
        <Image src="/images/decoration-3.svg" alt="" width={105} height={121} />
      </div>

      {/* More Green Circles */}
      <div className="absolute left-[359px] top-[1586px] w-[45.8px] h-[45.77px] bg-[#24FF00] rounded-full shadow-[0px_0px_6.48px_2.05px_rgba(36,255,0,1)]" />
      <div className="absolute left-[412px] top-[2113px] w-[45.8px] h-[45.77px] bg-[#24FF00] rounded-full shadow-[0px_0px_6.48px_2.05px_rgba(36,255,0,1)]" />
      <div className="absolute left-[1072px] top-[1818px] w-[45.8px] h-[45.77px] bg-[#24FF00] rounded-full shadow-[0px_0px_6.48px_2.05px_rgba(36,255,0,1)]" />

      {/* What's HackOnX Frame 11 */}
      <div className="absolute left-[-120.15px] top-[1157px] w-[1680.54px] h-[283px] flex flex-col justify-center items-center gap-6 px-[139px] py-12 bg-gradient-to-r from-[#E9E3FF] to-[#E9FFE5] rounded-2xl">
        <h2 className="w-[486px] h-[61px] font-silkscreen font-normal text-[48px] leading-[61px] text-[#5425FF]">What's HackOnX</h2>
        <p className="w-[1108px] h-[102px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-black">
          HackOnX is a multi-state offline hackathon bringing together India's smartest student builders. Designed around High-Performance Computing, it challenges you to solve real-world problems at scale. Learn, build, and compete—city by city.
        </p>
      </div>

      {/* HIGHLIGHTS Frame 22 */}
      <div className="absolute top-[1600px] w-[1383px] h-[574px] flex flex-col items-center gap-9" style={{ left: 'calc(50% - 1383px/2 - 2.5px)' }}>
        <h2 className="w-[1383px] h-[74px] font-silkscreen font-normal text-[58px] leading-[74px] text-center text-[#5425FF]">HIGHLIGHTS</h2>
        
        <div className="w-[1383px] h-[464px] flex flex-col gap-6">
          {/* Row 1 */}
          <div className="w-[1383px] h-[220px] flex gap-6">
            {[
              { text: "36-hour non-stop build marathon", img: "highlight-1.png" },
              { text: "Happening across 5+ states", img: "highlight-2.png" },
              { text: "Work with top industry mentors", img: "highlight-3.png" },
              { text: "Win cash prizes & national recognition", img: "highlight-4.png" }
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-center items-center gap-5 px-[84px] py-[26px] bg-[#F3F3F3] rounded-2xl">
                <div className="w-20 h-20 bg-[#5425FF] rounded-xl">
                  <Image src={`/images/highlights/${item.img}`} alt="" width={80} height={80} className="w-full h-full rounded-xl" />
                </div>
                <p className="w-[264px] h-[68px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-[#6A6A6A]">{item.text}</p>
              </div>
            ))}
          </div>
          
          {/* Row 2 */}
          <div className="w-[1383px] h-[220px] flex gap-6">
            {[
              { text: "Solve real-world problem statements", img: "highlight-5.png", width: "445px" },
              { text: "Meet tech leaders & potential employers", img: "highlight-6.png", width: "445px" },
              { text: "Showcase your work to recruiters", img: "highlight-7.png", width: "445px" }
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-center items-center gap-5 px-[84px] py-[26px] bg-[#F3F3F3] rounded-2xl">
                <div className="w-20 h-20 bg-[#5425FF] rounded-xl">
                  <Image src={`/images/highlights/${item.img}`} alt="" width={80} height={80} className="w-full h-full rounded-xl" />
                </div>
                <p className="w-[264px] h-[68px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-[#6A6A6A]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LOCATIONS Frame 28 */}
      <div className="absolute left-[26px] top-[2334px] w-[1388px] h-[716px] flex flex-col justify-center items-center gap-9">
        <div className="w-[1388px] h-[120px] flex flex-col items-center gap-3">
          <h2 className="w-[1388px] h-[74px] font-silkscreen font-normal text-[58px] leading-[74px] text-center text-[#5425FF]">LOCATIONS</h2>
          <p className="w-[1108px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-black">Choose your city at registration</p>
        </div>
        
        <div className="w-[1388px] h-[560px] flex flex-col gap-6">
          {/* Row 1 */}
          <div className="w-[1388px] h-[172px] flex justify-center items-center gap-6">
            {[
              { city: "Bengaluru", img: "bengaluru.png" },
              { city: "Chennai", img: "chennai.png" },
              { city: "Hyderabad", img: "hyderabad.png" }
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex items-center justify-center gap-5 px-6 py-[26px] bg-[#F3F3F3] rounded-2xl">
                <div className="w-[120px] h-[120px] rounded-xl">
                  <Image src={`/images/locations/${item.img}`} alt="" width={120} height={120} className="w-full h-full rounded-xl" />
                </div>
                <div className="flex flex-col justify-center gap-2 w-[264px] h-[94px]">
                  <p className="w-[264px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-black">{item.city}</p>
                  <div className="flex flex-col gap-1 w-[264px] h-[52px]">
                    <p className="w-[264px] h-[24px] font-figtree font-semibold text-[20px] leading-[24px] text-[#6A6A6A]">Date : 17 / 03 / 2025</p>
                    <p className="w-[264px] h-[24px] font-figtree font-semibold text-[20px] leading-[24px] text-[#6A6A6A]">Venue: Social Indirangar</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Row 2 */}
          <div className="w-[1388px] h-[172px] flex justify-center items-center gap-6">
            {[
              { city: "Goa", img: "goa.png" },
              { city: "Pune", img: "pune.png" },
              { city: "Delhi NCR", img: "delhi.png" }
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex items-center justify-center gap-5 px-6 py-[26px] bg-[#F3F3F3] rounded-2xl">
                <div className="w-[120px] h-[120px] rounded-xl">
                  <Image src={`/images/locations/${item.img}`} alt="" width={120} height={120} className="w-full h-full rounded-xl" />
                </div>
                <div className="flex flex-col justify-center gap-2 w-[264px] h-[94px]">
                  <p className="w-[264px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-black">{item.city}</p>
                  <div className="flex flex-col gap-1 w-[264px] h-[52px]">
                    <p className="w-[264px] h-[24px] font-figtree font-semibold text-[20px] leading-[24px] text-[#6A6A6A]">Date : 17 / 03 / 2025</p>
                    <p className="w-[264px] h-[24px] font-figtree font-semibold text-[20px] leading-[24px] text-[#6A6A6A]">Venue: Social Indirangar</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Map */}
          <div className="w-[1389px] h-[168px]">
            <Image src="/images/map.svg" alt="" width={1389} height={168} className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* In Collaboration With Frame 29 */}
      <div className="absolute left-[25px] top-[3210px] w-[1390px] h-[294px] flex flex-col items-center gap-9">
        <h2 className="w-[1390px] h-[74px] font-silkscreen font-normal text-[58px] leading-[74px] text-center text-[#5425FF]">In Collaboration With</h2>
        <div className="w-[1390px] h-[184px] flex flex-row flex-wrap justify-center items-center gap-6">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div key={idx} className="w-[200px] h-[80px] bg-[#D9D9D9]" />
          ))}
        </div>
      </div>

      {/* Meet the Experts Frame 35 */}
      <div className="absolute left-[25.61px] top-[3664px] w-[1389px] h-[552px] flex flex-col gap-9">
        <div className="w-[1389px] h-[154px] flex flex-col items-center gap-3">
          <h2 className="w-[1389px] h-[74px] font-silkscreen font-normal text-[58px] leading-[74px] text-center text-[#5425FF]">Meet the Experts</h2>
          <p className="w-[765px] h-[68px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-black">
            Your projects will be evaluated and guided by leading professionals in HPC, AI, cloud, and engineering.
          </p>
        </div>
        
        <div className="w-[1389px] h-[362px] flex justify-between items-center gap-[14px]">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="flex flex-col gap-4 w-[264px] h-[362px]">
              <div className="w-[260px] h-[280px] rounded-xl">
                <Image src="/images/experts/expert-1.png" alt="" width={260} height={280} className="w-full h-full rounded-xl" />
              </div>
              <div className="flex flex-col justify-center items-center gap-2 w-[264px] h-[66px]">
                <p className="w-[264px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-black">&lt;Name&gt;</p>
                <p className="w-[264px] h-[24px] font-figtree font-semibold text-[20px] leading-[24px] text-center text-[#6A6A6A]">Director, HPC Labs</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prize Pool Group 35185 */}
      <div className="absolute left-[16.11px] top-[4376px] w-[1408px] h-[815px]">
        <div className="absolute left-[25.11px] top-0 w-[1389px] h-[815px]">
          <div className="absolute left-0 top-0 w-[1389px] h-[815px] bg-[#D9D9D9] rounded-2xl" />
          <div className="absolute left-0 top-[-26px] w-[1389px] h-[841px] bg-[#5425FF] rounded-2xl" />
        </div>
        
        <h2 className="absolute left-0 top-[23px] w-[1408px] h-[73px] font-silkscreen font-normal text-[58px] leading-[74px] text-center text-white">Prize Pool</h2>
        
        <div className="absolute left-[25.11px] top-[121px] w-[1389px] h-[112px] flex items-center justify-center gap-[10px] px-[9px] py-[10px] bg-[#24FF00]">
          <p className="w-[618px] h-[92px] font-silkscreen font-normal text-[72px] leading-[92px] text-center text-[#5425FF]">₹XX,XX,XXX+</p>
        </div>
        
        <div className="absolute left-[257.09px] top-[278px] w-[926.06px] h-[150px] flex flex-col justify-center items-center gap-3">
          <p className="w-[926.06px] h-[42px] font-figtree font-semibold text-[34.8985px] leading-[42px] text-center text-white">1st Prize: Cash + Laptop + Goodies + Fast-Track Internship</p>
          <p className="w-[926.06px] h-[42px] font-figtree font-semibold text-[34.8985px] leading-[42px] text-center text-white">2nd Prize: Cash + Swag + Industry Vouchers</p>
          <p className="w-[926.06px] h-[42px] font-figtree font-semibold text-[34.8985px] leading-[42px] text-center text-white">3rd Prize: Goodies + Tech Accessories + Recognition</p>
        </div>
        
        <div className="absolute left-[257.09px] top-[486px] w-[1058px] h-[138px] flex flex-col justify-center items-center gap-[18px]">
          <p className="w-[1058px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-[#24FF00]">For Every Participant</p>
          <div className="w-[1058px] h-[86px] flex flex-row flex-wrap justify-center items-center gap-[18px]">
            <p className="w-[384px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-white">Certificate of Participation</p>
            <p className="w-[280px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-white">Access to mentors</p>
            <p className="w-[380px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-white">Visibility to hiring partners</p>
            <p className="w-[577px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-white">Event Swags (T-shirt, Stickers, Notebook)</p>
          </div>
        </div>
      </div>

      {/* THEMES Frame 48 */}
      <div className="absolute left-[26px] top-[5351px] w-[1388px] h-[586px] flex flex-col items-center gap-9">
        <div className="w-[1388px] h-[120px] flex flex-col items-center gap-3">
          <h2 className="w-[1388px] h-[74px] font-silkscreen font-normal text-[58px] leading-[74px] text-center text-[#5425FF]">THEMES</h2>
          <p className="w-[765px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-black">Build solutions across cutting-edge domains:</p>
        </div>
        
        <div className="w-[1388px] h-[430px] flex flex-col gap-6">
          {/* Row 1 */}
          <div className="w-[1388px] h-[220px] flex gap-6">
            {[
              { text: "High-Performance Computing", img: "theme-1.png" },
              { text: "AI / ML", img: "theme-2.png" },
              { text: "Developer Tools", img: "theme-3.png" },
              { text: "Cloud & Distributed Systems", img: "theme-4.png" }
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-center items-center gap-5 px-[84px] py-[26px] bg-[#F3F3F3] rounded-2xl">
                <div className="w-20 h-20 bg-[#5425FF] rounded-xl">
                  <Image src={`/images/themes/${item.img}`} alt="" width={80} height={80} className="w-full h-full rounded-xl" />
                </div>
                <p className="w-[264px] h-[68px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-[#6A6A6A]">{item.text}</p>
              </div>
            ))}
          </div>
          
          {/* Row 2 */}
          <div className="w-[1388px] h-[186px] flex gap-6">
            {[
              { text: "Cybersecurity", img: "theme-5.png" },
              { text: "Sustainability", img: "theme-6.png" },
              { text: "Open Innovation", img: "theme-7.png" }
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-center items-center gap-5 px-[84px] py-[26px] bg-[#F3F3F3] rounded-2xl">
                <div className="w-20 h-20 bg-[#5425FF] rounded-xl">
                  <Image src={`/images/themes/${item.img}`} alt="" width={80} height={80} className="w-full h-full rounded-xl" />
                </div>
                <p className="w-[264px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-[#6A6A6A]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS Frame 57 */}
      <div className="absolute left-[-120.15px] top-[6097px] w-[1680.54px] h-[592px] flex flex-col items-center gap-8">
        <div className="w-[1680.54px] h-[112px] flex items-center justify-center gap-[10px] px-[9px] py-[10px] bg-[#24FF00]">
          <h2 className="w-[594px] h-[92px] font-silkscreen font-normal text-[72px] leading-[92px] text-center text-[#5425FF]">HOW IT WORKS</h2>
        </div>
        
        <div className="w-[731px] h-[448px] flex flex-col gap-4">
          {[
            { step: "1", title: "Register your team", desc: " (Team of 4)" },
            { step: "2", title: "Select your city", desc: "Attend the offline edition near you." },
            { step: "3", title: "Build for 36 hours", desc: "Solve a real-world problem with your team." },
            { step: "4", title: "Demo to judges", desc: "Top teams from each city qualify for the grand stage." }
          ].map((item, idx) => (
            <div key={idx} className="w-[731px] h-[100px] flex items-center gap-9 px-[37px] py-[13px] bg-[#E9FEE6] rounded-xl">
              <p className="w-[37px] h-[74px] font-silkscreen font-normal text-[58px] leading-[74px] text-center text-[#5425FF]">{item.step}</p>
              <div className="flex flex-col justify-center gap-1">
                <p className="font-figtree font-semibold text-[28px] leading-[34px] text-black">{item.title}</p>
                <p className="font-figtree font-semibold text-[20px] leading-[24px] text-[#6A6A6A]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RULES & ELIGIBILITY Frame 56 */}
      <div className="absolute left-[337.61px] top-[6849px] w-[765px] h-[750px] flex flex-col items-center gap-8">
        <h2 className="w-[765px] h-[74px] font-silkscreen font-normal text-[58px] leading-[74px] text-center text-[#5425FF]">RULES & ELIGIBILITY</h2>
        
        <div className="w-[731px] h-[564px] flex flex-col gap-4">
          {[
            "Team of exactly 4 students",
            "Must be enrolled in any college in India",
            "Only original work allowed",
            "Allowed tech stack: Open-source, Cloud tools, HPC resources",
            "Judging criteria: Innovation | Feasibility | Technical Execution | Presentation"
          ].map((rule, idx) => (
            <div key={idx} className="w-[731px] h-[100px] flex items-center gap-9 px-[37px] py-[13px] bg-[#F3F3F3] rounded-xl">
              <p className="w-[44px] h-[74px] font-silkscreen font-normal text-[58px] leading-[74px] text-center text-[#5425FF]">{idx + 1}</p>
              <p className="font-figtree font-semibold text-[28px] leading-[34px] text-black flex-1">{rule}</p>
            </div>
          ))}
        </div>
        
        <button className="flex items-center justify-center px-6 py-3 gap-[10px] w-[183px] h-[48px] bg-[#5425FF]">
          <span className="w-[135px] h-[24px] font-figtree font-medium text-[20px] leading-[24px] text-center text-white">View Full Rules</span>
        </button>
      </div>

      {/* GALLERY Frame 58 */}
      <div className="absolute left-[25.61px] top-[7759px] w-[1389px] h-[436px] flex flex-col gap-9">
        <div className="w-[1389px] h-[120px] flex flex-col items-center gap-3">
          <h2 className="w-[1389px] h-[74px] font-silkscreen font-normal text-[58px] leading-[74px] text-center text-[#5425FF]">GALLERY</h2>
          <p className="w-[765px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-black">A sneak peek into the vibe</p>
        </div>
        <div className="w-[1389px] h-[280px] flex items-center gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="flex-1 h-[280px] rounded-xl">
              <Image src="/images/gallery.svg" alt="" width={329} height={280} className="w-full h-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      {/* Registration CTA Frame 65 */}
      <div className="absolute left-[26.11px] top-[8355px] w-[1388px] h-[440px] flex flex-col gap-[10px] py-[67px]">
        <div className="absolute left-0 top-0 w-[1388px] h-[440px]">
          <div className="absolute left-0 top-0 w-[1388px] h-[440px] bg-[#F2F2F2] rounded-2xl" />
          <Image src="/images/cta-bg.svg" alt="" width={1388} height={440} className="absolute left-0 top-0 w-full h-full rounded-2xl" />
        </div>
        
        <div className="relative z-10 w-[1388px] h-[286.89px] flex flex-col justify-center items-center gap-[23px]">
          <p className="w-[844px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-center text-[#6A6A6A]">Hurry! Only limited seats per city.</p>
          
          <div className="w-[709px] h-[158.89px] relative">
            <div className="absolute left-[62px] top-[33px] w-[585px] h-[92px] bg-[#5425FF]" />
            <div className="absolute left-0 top-0 w-[709px] h-[158.89px] flex items-center justify-between gap-[696px]">
              <div className="w-[105.27px] h-[121.27px] rotate-[32.61deg]">
                <Image src="/images/decoration-1.svg" alt="" width={105} height={121} />
              </div>
              <p className="w-[320px] h-[29px] font-figtree font-bold text-[24px] leading-[120%] text-center text-white">Registrations close in 8 days</p>
              <div className="w-[105.27px] h-[121.27px] -rotate-[32.61deg]">
                <Image src="/images/decoration-2.svg" alt="" width={105} height={121} />
              </div>
            </div>
          </div>
          
          <Link href="/signup" className="flex items-center justify-center px-6 py-3 gap-[10px] w-[171px] h-[48px] bg-[#5425FF] hover:bg-[#4319CC] transition-colors">
            <span className="w-[123px] h-[24px] font-figtree font-medium text-[20px] leading-[24px] text-center text-white">Register Now</span>
          </Link>
        </div>
      </div>

      {/* FAQ Frame 59 */}
      <div className="absolute left-[337.61px] top-[8955px] w-[765px] h-[554px] flex flex-col items-center gap-8">
        <h2 className="w-[765px] h-[74px] font-silkscreen font-normal text-[58px] leading-[74px] text-center text-[#5425FF]">FAQ</h2>
        
        <div className="w-[731px] h-[448px] flex flex-col gap-4">
          {[
            { q: "Who can participate?", a: "Any student currently enrolled in a college" },
            { q: "Is it free?", a: "Yes, participation is completely free." },
            { q: "Is it an offline event?", a: "Yes, 100% offline across all cities." },
            { q: "Are the prizes real?", a: "Absolutely — backed by sponsors and partners." }
          ].map((item, idx) => (
            <div key={idx} className="w-[731px] h-[100px] flex items-center gap-9 px-[37px] py-[13px] bg-[#F3F3F3] rounded-xl">
              <div className="flex flex-col justify-center gap-1">
                <p className="font-figtree font-semibold text-[28px] leading-[34px] text-black">{item.q}</p>
                <p className="font-figtree font-semibold text-[20px] leading-[24px] text-[#6A6A6A]">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Frame 63 */}
      <div className="absolute left-[26.11px] top-[9669px] w-[1388px] h-[440px] flex flex-col items-center gap-[10px] px-[65px] py-[89px]">
        <div className="absolute left-0 top-0 w-[1388px] h-[440px]">
          <div className="absolute left-0 top-0 w-[1388px] h-[440px] bg-[#F2F2F2] rounded-2xl" />
          <div className="absolute left-[-29.02px] top-[-10px] w-[1446.04px] h-[1031px] bg-[#5425FF]" />
          <Image src="/images/footer-bg.svg" alt="" width={1388} height={440} className="absolute left-0 top-0 w-full h-full rounded-2xl" />
        </div>
        
        <div className="relative z-10 w-[1244px] h-[215px] flex items-end justify-between gap-[411px]">
          <div className="flex flex-col gap-3 w-[380px] h-[126px]">
            <p className="w-[380px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-white">Email: support@hackonx.com</p>
            <p className="w-[337px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-white">Phone: +91 XXXXX XXXXX</p>
            <p className="w-[256px] h-[34px] font-figtree font-semibold text-[28px] leading-[34px] text-white">Instagram | LinkedIn</p>
          </div>
          
          <div className="flex flex-col justify-between items-end w-[472px] h-[215px]">
            <p className="w-[453px] h-[89px] font-silkscreen font-normal text-[69.4337px] leading-[89px] tracking-[0.17em] text-white">HackOnX</p>
            <div className="flex items-center gap-[38px] w-[472px] h-[34px]">
              {["Home", "Register", "Rules", "Contact"].map((item, idx) => (
                <p key={idx} className="font-figtree font-semibold text-[28px] leading-[34px] text-white">{item}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Final Decorative Element */}
      <div className="absolute left-[31px] top-[1373.15px] w-[105.27px] h-[121.27px] -rotate-[40.45deg]">
        <Image src="/images/decoration-small.svg" alt="" width={105} height={121} />
      </div>
      </main>
    </div>
  );
}
