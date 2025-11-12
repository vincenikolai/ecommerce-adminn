import Image from "next/image";

export default function ContactPage() {
  return (
    <div
      className="min-h-screen bg-cover bg-center relative"
      style={{ backgroundImage: `url('/wallpaper.jpg')` }}
    >
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8 space-y-12 relative z-10">
        {/* Contact Us Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center rounded-3xl bg-white/95 backdrop-blur-sm p-8 md:p-12 border border-gray-200/50 shadow-2xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="inline-block bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-2 rounded-xl mr-3 shadow-lg">
                  Contact
                </span>
                <span className="text-gray-800">Us</span>
              </h1>
              <div className="w-16 h-0.5 bg-gray-300 rounded-full"></div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-blue-50/50 rounded-xl border-l-4 border-blue-600">
                <div className="w-3 h-3 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-semibold text-gray-800">Address</p>
                  <p className="text-gray-600">
                    Door #2, Chua Bldg, Maa Road, Davao City, 8000
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-blue-50/50 rounded-xl border-l-4 border-blue-600">
                <div className="w-3 h-3 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-semibold text-gray-800">Email</p>
                  <a
                    href="mailto:info@elachemicals.com"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    info@elachemicals.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-blue-50/50 rounded-xl border-l-4 border-blue-600">
                <div className="w-3 h-3 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-semibold text-gray-800">Phone</p>
                  <p className="text-gray-600">082 225 6826 | 082 297 2705</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl"></div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-xl">
              <Image
                src="/office.jpg"
                alt="Team at ELA Chemicals"
                fill
                className="object-cover"
                priority={false}
              />
            </div>
          </div>
        </section>

        {/* About ELA Chemicals Section */}
        <section className="rounded-3xl bg-white p-8 md:p-12 border border-gray-200 shadow-2xl">
          <div className="space-y-8">
            {/* Header with logo */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-6 ml-20">
                <span className="text-[#0A2E6C] text-3xl md:text-4xl font-bold">
                  About
                </span>
                <Image
                  src="/logo.png"
                  alt="ELA Chemicals"
                  width={520}
                  height={156}
                  className="h-28 md:h-32 w-auto"
                />
                <span className="text-[#0A2E6C] font-bold text-3xl md:text-4xl">
                  Chemicals
                </span>
              </div>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full mx-auto"></div>
            </div>

            {/* Company description */}
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 p-6 rounded-2xl border-l-4 border-blue-600">
                <p className="text-gray-800 leading-relaxed text-lg">
                  A homegrown sanitation consultancy, we help local brands and
                  businesses create proactive sanitation programs to keep
                  operations running smooth, uninterrupted, and profitable.
                  Bringing 8 years of product development expertise, what
                  started as making commercial cleaning products, turned to a
                  sanitation consulting outfit. This shift led us to educate
                  clients first so you'll have informed decisions about
                  sanitation practices and create a total package solution
                  specific to your business needs.
                </p>
              </div>

              <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 p-6 rounded-2xl border-l-4 border-gray-400">
                <p className="text-gray-800 leading-relaxed text-lg">
                  Founded in 2014 in Davao City, Philippines, ELA Chemicals
                  envisions itself as a strategic partner in providing cleaning
                  and sanitation programs to food and beverage manufacturing
                  companies, hotels and restaurants, commissaries, and other
                  industries based in Davao City, Philippines.
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 p-6 rounded-2xl border-l-4 border-blue-600">
                <p className="text-gray-800 leading-relaxed text-lg">
                  We advocate for clean, safe, and healthy environments for all
                  by consistently innovating professional sanitation solutions
                  through extensive research and development. It gives companies
                  access to cost-efficient and globally competitive systems
                  tailor-fit towards their needs and requirements to keep their
                  workplaces and facilities free from the threats to the
                  well-being of the workers through to the end-user.
                </p>
              </div>
            </div>

            {/* Vision and Mission */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Vision */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 rounded-2xl shadow-xl">
                <div className="text-center space-y-4">
                  <div className="w-16 h-0.5 bg-white/50 rounded-full mx-auto"></div>
                  <h3 className="text-2xl font-bold">Our Vision</h3>
                  <p className="text-blue-100 leading-relaxed">
                    ELA Chemicals envisions itself to be the top choice for
                    total package solutions in professional sanitation and
                    products in the key and emerging markets first in Mindanao
                    and then the Philippines.
                  </p>
                </div>
              </div>

              {/* Mission */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-8 rounded-2xl shadow-xl">
                <div className="space-y-4">
                  <div className="w-16 h-0.5 bg-white/50 rounded-full"></div>
                  <h3 className="text-2xl font-bold">Our Mission</h3>
                  <ul className="space-y-3 text-blue-100">
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span>
                        Provide consistent, top quality, value for money
                        cleaning and sanitation products and services focused on
                        food and beverage manufacturing companies, hotels and
                        restaurants, laundry, commissaries, and other
                        industries.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span>
                        Guide business partners with customized, latest cleaning
                        technology.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span>
                        Build lasting partnership with stakeholders with the
                        goal of growing together through: Delighting our
                        customers with excellent products and solutions which
                        are critical in our mutual long-term success.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span>
                        Developing home grown quality and excellent employees
                        with I.N.T.E.G.R.I.T.Y. and Malasakit.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span>
                        Ensuring a good return of investment to our investors
                        and fair reward to our employees.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span>
                        Keeping a safe and healthy environment for everyone.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
