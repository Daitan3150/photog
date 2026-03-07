const admin = require('firebase-admin');

const serviceAccountKeyStr = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCutEtUAd81niIW\nkuoNdTIzn9C2crvK/5IWBQTNFfJ/4qn5Z4uI5/2Hx3b7uHTwLLdVX0fASovmOuve\nr4sFQP6VHFYnJ81Krz2OutoyDRs7PvHFoUJWjpEDPQhHcJ/r5+5QQNm2Posq+qcO\nMh6mOSy5vVZsAIaCNcawJrW0OYFPjQCdBxgDNs/avmHrTvsAy14a/dJKZ0sFMdOx\nSy0m8VyTSqhSd9vHONzVQ4R2y6eKRrFfBvxkJJuJXfg+xC+n7Y8tj+Hdc7E07Nct\nXIycJePWlbwqGViWtEjWY7BYlX0DNsg9AzzddoAgg3JbG20NMwaelZxdjsP9Yjyk\nJ1Ey0wa5AgMBAAECggEADXohGYDvdtO/w3K1QDEwnI+RP+cymiKvDVMjygJjFlR7\np57CQonK+Boou/BrLPVLdfgyBnZ5u7ADRBwnTad0PDfXDubgzQh0Z49TMms/v4lH\n3hFmQbEhJK56S1s31bCq+gvr/5rBjPY7GZA/kbPKwdAGW7HgA9Qhg13pGdcZz54W\nAuVJuyNuq/4D8N/ziJmWPnOZI4XnmN19yT57duH/29EDcfRbWwLQMQAqiqCzD4Fy\nT1JkSWE+iGAmMedc6f5B5oNm13YHf5F8SmrSCMVKKeT6QMrqqj0xPRM2uT9xyr+m\nKZwnL/6rRo92z2E/L4X8BZtj70pDJXkx3gg6Bv/R9QKBgQDbikqDhfD4CGXAp6v/\nmMpRKutHT+AWQeILIuzXy7kakSqF5lRGpZ3Nbj16uGxsFDsK5F582xqcT+l85qrZ\n9JUMmNUy0Zz+oeKXJLpNr2N18JGHRElbfiTTnmMJFWM3+wk3PgeAwvTlspY69PGG\ngElYElyMKHfGagVkH4cAoAuVAwKBgQDLt9ACbsypyefiHjArQ2v36/qYhq/lChRr\n8F6rO9o4+Hoz/qxnIorYqD3pvC60a7T4a5m/xUCe+/K0uq0mtX9ez0QtTmXqclAe\nUJ2zDfGO3skBYOaMm6o0EfOqu6bIGj/rB/Jk6tTASy+70h4F5+oX0wZ3lsp5U78L\nxHClaVDSkwKBgHIj1xPEWoEKFKTyR8lOjblfgA2GaLIJtNUnZk3XnDhEyv/svVox\nlvaMXyhjo/MZHY1PKBTv8Ujdfz4xyxggQjHXb9jJBD+auOzt6nKjQim6Vl8mUKFh\n1xGy4jiBxyD+wk7XUB1QvvSBQfwLB1tvbTJ98WHpVERzMLRac90OWJczAoGAJAlC\n8Xs6FvrRWw1uBekqSzPiI2MH8GMlE6b0iCPRSWyi6Vmuk5vnpcW1Fgik1mOLIrqd\n+u9gq/7zgwbWpFdMza+qZr1Mh/lqtMIb81WPGm/MbMMAZXUP2aAnU1dYfGMwVVoV\nhcaIle925SmZCABrR4WbykHRVT78N4+rQYdstaMCgYA8K3CpwqQE8DDMJO7+K347\ngujTa4NAoLlklgd6rZvTXyvcXnVEFOzKeh0EiEDsEwZBUQ2jnmdCOL62hIPqByNw\ngQ2DT2JujjuGgJw//3ZwGJhFnUGWDnBmEQtpF+FyoF2Ub24qLPHML0UFioP/FF4t\nQab0l0OaWk5KHHhuUWZF3g==\n-----END PRIVATE KEY-----\n`;

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: 'daitan-portfolio',
        clientEmail: 'firebase-adminsdk-fbsvc@daitan-portfolio.iam.gserviceaccount.com',
        privateKey: serviceAccountKeyStr
    })
});

async function main() {
    try {
        const email = 'testuser123@example.com';
        const password = 'Password123!';
        let user;
        try {
            user = await admin.auth().getUserByEmail(email);
            await admin.auth().updateUser(user.uid, { password });
        } catch (e) {
            user = await admin.auth().createUser({ email, password, emailVerified: true });
        }
        console.log('Test user ready. Email:', email, 'Pass:', password);

        // Ensure admin claim if needed
        await admin.auth().setCustomUserClaims(user.uid, { admin: true });
        console.log('Added admin claim just in case.');

    } catch (err) {
        console.error(err);
    }
}

main().then(() => process.exit(0)).catch(() => process.exit(1));
