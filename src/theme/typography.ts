/** Central typography tokens. Keep font registrations in app/_layout.tsx in sync. */
export const fontSizes={
 caption:12,
 label:13,
 body:14,
 input:15,
 section:16,
 title:20,
 summary:26,
 display:30,
} as const;

export const fontFamilies={
 regular:'Inter_400Regular',
 medium:'Inter_500Medium',
 semibold:'Inter_600SemiBold',
 bold:'Inter_700Bold',
 displayMedium:'PlusJakartaSans_500Medium',
 displaySemibold:'PlusJakartaSans_600SemiBold',
 displayBold:'PlusJakartaSans_700Bold',
} as const;

export const fontWeights={regular:'400',medium:'500',semibold:'600',bold:'700'} as const;

/** Reusable non-color text styles. Apply a theme color at the call site. */
export const textStyles={
 caption:{fontSize:fontSizes.caption,fontFamily:fontFamilies.regular},
 label:{fontSize:fontSizes.label,fontFamily:fontFamilies.medium},
 body:{fontSize:fontSizes.body,fontFamily:fontFamilies.regular},
 input:{fontSize:fontSizes.input,fontFamily:fontFamilies.medium},
 section:{fontSize:fontSizes.section,fontFamily:fontFamilies.semibold},
 title:{fontSize:fontSizes.title,fontFamily:fontFamilies.displayBold},
 summary:{fontSize:fontSizes.summary,fontFamily:fontFamilies.displayBold},
 display:{fontSize:fontSizes.display,fontFamily:fontFamilies.displaySemibold},
} as const;
