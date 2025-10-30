// Mock for next/image
import React from "react";

const NextImage = (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
  // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
  return <img {...props} />;
};

export default NextImage;
