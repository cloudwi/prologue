/**
 * app.json을 기본으로 쓰되, EAS 빌드에서만 달라지는 값을 덮어쓴다.
 *
 * google-services.json은 퍼블릭 레포에 커밋하지 않는다(.gitignore). 그래서 EAS 클라우드에는
 * 파일이 없고, 대신 파일형 환경변수(GOOGLE_SERVICES_JSON)가 임시 경로에 풀어준다 —
 * 그 경로가 있으면 그걸 쓰고, 없으면(로컬 프리빌드) 옆에 있는 실제 파일을 쓴다.
 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
