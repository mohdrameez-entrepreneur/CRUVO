import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export const scale = (size) => (width / BASE_WIDTH) * size;
export const verticalScale = (size) => (height / BASE_HEIGHT) * size;
export const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;
export const moderateVerticalScale = (size, factor = 0.5) => size + (verticalScale(size) - size) * factor;

export const screenWidth = width;
export const screenHeight = height;
export const isSmallDevice = width < 375;
export const isMediumDevice = width >= 375 && width < 414;
export const isLargeDevice = width >= 414;
