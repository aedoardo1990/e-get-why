import React from 'react'
import Image from 'next/image';


const Hero = () => {
  return (
    <section className="hero bg-base-300 min-h-screen">
      <div className="grid grid-cols-1 gap-4 p-6 ">
        <div className="flex flex-col p-6">
          <div className='flex items-center justify-center'>
            <h3 className="text-5xl font-bold text-green-600 mb-4 mr-4 text-center">Welcome to EGetWhy</h3>
            <Image
              className="object-cover"
              width={75}
              height={70}
              src="/egetwhy-logo.webp"
              alt="bg-image"
            />
          </div>
          <div className="mt-4 flex-grow">
            <p>Connecting Nigerians through shared experiences and support. Join our community to gain advice, find job opportunities, share local knowledge, and make your voice heard.</p>
            <br />
            <video autoPlay muted loop>
              <source src='/Video-hero.mp4' type='video/mp4'></source>
            </video>
            <div className='text-center mt-7'>
              <button className="btn btn-outline btn-primary">GET STARTED</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero