export default function Page() {
  return (
    <div className="min-h-screen bg-[#c7e6fa] flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-6 mt-8 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-extrabold mb-2">
                LOOKING FOR A<br />
                RELIABLE <span className="bg-blue-200 px-2">CLEANING</span>
                <br />
                SOLUTION?
              </h2>
              <p className="mb-4 text-gray-600">
                Live for influential and innovative fashion!
              </p>
              <button className="bg-black text-white px-6 py-2 rounded-lg font-semibold">
                SHOP NOW
              </button>
            </div>
            <img
              src="/your-image-path.png"
              alt="Cleaning Products"
              className="rounded-xl w-48 h-32 object-cover"
            />
          </div>
        </div>
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-6">
          <h3 className="italic text-lg mb-4">Industries We Serve</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center">
              <img
                src="/your-image-path-1.png"
                alt="Food and Beverage"
                className="rounded-lg w-40 h-32 object-cover"
              />
              <span className="mt-2 font-medium">Food and Beverage</span>
              <span className="text-xs text-gray-500">Explore Now!</span>
            </div>
            <div className="flex flex-col items-center">
              <img
                src="/your-image-path-2.png"
                alt="Offices"
                className="rounded-lg w-40 h-32 object-cover"
              />
              <span className="mt-2 font-medium">Offices</span>
              <span className="text-xs text-gray-500">Explore Now!</span>
            </div>
            <div className="flex flex-col items-center">
              <img
                src="/your-image-path-3.png"
                alt="Laundry"
                className="rounded-lg w-40 h-32 object-cover"
              />
              <span className="mt-2 font-medium">Laundry</span>
              <span className="text-xs text-gray-500">Explore Now!</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
