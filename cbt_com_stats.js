/**
 * cbt_com_stats.js — cbt_com_quiz.html의 QUESTIONS 배열을 파싱하여
 * 회차·과목별 통계와 문제 원본 배열을 콜백으로 반환합니다.
 *
 * 컴퓨터활용능력 1급 필기 분류 체계:
 *   - round: 회차 (예: 2024-1, 2024-2, ... 숫자 또는 문자열)
 *   - subject: 1, 2, 3
 *       1과목 = 컴퓨터 일반
 *       2과목 = 스프레드시트 일반
 *       3과목 = 데이터베이스 일반
 */
(function () {
  'use strict';

  // 과목 번호 → 과목명 매핑 (컴활 1급 필기 공식)
  var SUBJECT_NAMES = {
    1: '컴퓨터 일반',
    2: '스프레드시트 일반',
    3: '데이터베이스 일반'
  };

  function loadStats(callback) {
    fetch('cbt_com_quiz.html')
      .then(function (r) { return r.text(); })
      .then(function (html) {
        // cbt_com_quiz.html의 script 태그 안에 있는 const QUESTIONS = [ ... ]; 배열을 찾기
        var arrMatch = html.match(/const\s+QUESTIONS\s*=\s*(\[[\s\S]*?\n\s*\])\s*;/);
        if (!arrMatch) {
          console.error('cbt_com_stats.js: QUESTIONS 배열 추출 실패');
          return;
        }

        // 새 Function으로 배열 리터럴을 실제 JS 객체로 변환
        var questions;
        try {
          questions = (new Function('return ' + arrMatch[1]))();
        } catch (e) {
          console.error('cbt_com_stats.js: QUESTIONS 파싱 오류', e);
          return;
        }

        var totalQ = questions.length;
        var roundMap = {};     // { '2024-1': xx, ... }  회차별 문항 수
        var subjectMap = {};   // { 1: xx, 2: xx, 3: xx }  과목별 문항 수
        var roundSet = new Set();
        var subjectSet = new Set();

        questions.forEach(function (q) {
          roundSet.add(q.round);
          subjectSet.add(q.subject);
          roundMap[q.round] = (roundMap[q.round] || 0) + 1;
          subjectMap[q.subject] = (subjectMap[q.subject] || 0) + 1;
        });

        // 회차 정렬 - 숫자/문자열 모두 지원 (예: 1, 2 또는 '2024-1', '2024-2')
        var rounds = Array.from(roundSet).sort(function (a, b) {
          // 둘 다 숫자형이면 숫자 비교
          if (typeof a === 'number' && typeof b === 'number') return a - b;
          // 그 외엔 문자열 비교 (자연 정렬)
          var sa = String(a), sb = String(b);
          return sa.localeCompare(sb, 'ko', { numeric: true });
        });
        var subjects = Array.from(subjectSet).sort(function (a, b) { return a - b; });
        var totalRounds = rounds.length;

        callback({
          totalQ: totalQ,
          totalRounds: totalRounds,
          rounds: rounds,
          subjects: subjects,
          roundMap: roundMap,
          subjectMap: subjectMap,
          subjectNames: SUBJECT_NAMES,
          questions: questions
        });
      })
      .catch(function (err) {
        console.error('cbt_com_stats.js fetch 오류:', err);
      });
  }

  window.CbtComStats = {
    load: loadStats,
    SUBJECT_NAMES: SUBJECT_NAMES
  };
})();
