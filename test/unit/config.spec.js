'use strict';

/* verify config settings are present */

describe('service', function() {
   beforeEach(module('app.config'));

   it('should have a valid FBURL', inject(function(FBURL) {
      expect(FBURL).toMatch(/^https:\/\/[a-zA-Z0-9_-]+\.firebaseio\.com$/i);
   }));

});
