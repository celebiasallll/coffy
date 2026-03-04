import Tilt from 'react-parallax-tilt';

export default function Card({ title, description }) {
  return (
    <Tilt
      glareEnable={true}
      glareMaxOpacity={0.18}
      glareColor="#D4A017"
      glarePosition="all"
      scale={1.04}
      transitionSpeed={1200}
      tiltMaxAngleX={12}
      tiltMaxAngleY={12}
      className="w-full"
    >
      <div className="bg-[#3A2A1E] p-6 rounded-lg shadow-lg text-center transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
      <h3 className="text-xl font-bold text-[#D4A017] mb-2">{title}</h3>
      <p className="text-[#E8D5B5]">{description}</p>
    </div>
    </Tilt>
  );
}